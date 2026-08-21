package com.peyvo.app;

import android.content.pm.PackageManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONException;

import java.util.ArrayList;
import java.util.List;

import ir.myket.billingclient.IabHelper;
import ir.myket.billingclient.util.IabResult;
import ir.myket.billingclient.util.Inventory;
import ir.myket.billingclient.util.Purchase;
import ir.myket.billingclient.util.SkuDetails;

@CapacitorPlugin(name = "MyketBilling")
public class MyketBillingPlugin extends Plugin {
    private IabHelper helper;
    private String configuredKey = "";
    private boolean setupReady = false;
    private boolean setupInProgress = false;
    private boolean operationInProgress = false;

    private interface SetupCallback {
        void ready();
        void failed(String message, String code, Integer response);
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject result = new JSObject();
        result.put("available", isMarketInstalled());
        result.put("store", BuildConfig.STORE_ID);
        result.put("packageName", getContext().getPackageName());
        call.resolve(result);
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        final String publicKey = clean(call.getString("publicKey", ""));
        final String sku = clean(call.getString("sku", ""));
        final String payload = clean(call.getString("payload", ""));
        if (publicKey.isEmpty() || sku.isEmpty() || payload.isEmpty()) {
            call.reject("اطلاعات لازم برای خرید مایکت ناقص است.", "INVALID_INPUT");
            return;
        }
        if (!isMarketInstalled()) {
            call.reject("فروشگاه برنامه روی دستگاه نصب نیست.", "STORE_NOT_INSTALLED");
            return;
        }
        if (operationInProgress) {
            call.reject("یک عملیات پرداخت دیگر در حال انجام است.", "BILLING_BUSY");
            return;
        }

        ensureSetup(publicKey, new SetupCallback() {
            @Override
            public void ready() {
                operationInProgress = true;
                getActivity().runOnUiThread(() -> {
                    try {
                        helper.launchPurchaseFlow(getActivity(), sku, (result, purchase) -> {
                            operationInProgress = false;
                            if (result == null || result.isFailure() || purchase == null) {
                                rejectResult(call, result, "خرید در مایکت تکمیل نشد.", "PURCHASE_FAILED");
                                return;
                            }
                            call.resolve(purchaseToJson(purchase));
                        }, payload);
                    } catch (Exception error) {
                        operationInProgress = false;
                        call.reject("شروع خرید مایکت ناموفق بود.", "PURCHASE_START_FAILED", error);
                    }
                });
            }

            @Override
            public void failed(String message, String code, Integer response) {
                rejectWithResponse(call, message, code, response);
            }
        });
    }

    @PluginMethod
    public void restore(PluginCall call) {
        final String publicKey = clean(call.getString("publicKey", ""));
        final JSArray inputSkus = call.getArray("skus", new JSArray());
        if (publicKey.isEmpty()) {
            call.reject("کلید عمومی مایکت تنظیم نشده است.", "PUBLIC_KEY_MISSING");
            return;
        }
        if (!isMarketInstalled()) {
            call.reject("فروشگاه برنامه روی دستگاه نصب نیست.", "STORE_NOT_INSTALLED");
            return;
        }
        if (operationInProgress) {
            call.reject("یک عملیات پرداخت دیگر در حال انجام است.", "BILLING_BUSY");
            return;
        }

        final List<String> skus = new ArrayList<>();
        for (int i = 0; i < inputSkus.length(); i++) {
            String sku = inputSkus.optString(i, "");
            if (!sku.isEmpty()) skus.add(sku);
        }

        ensureSetup(publicKey, new SetupCallback() {
            @Override
            public void ready() {
                operationInProgress = true;
                try {
                    helper.queryInventoryAsync(true, skus, (result, inventory) -> {
                        operationInProgress = false;
                        if (result == null || result.isFailure() || inventory == null) {
                            rejectResult(call, result, "بازیابی خریدهای مایکت ناموفق بود.", "RESTORE_FAILED");
                            return;
                        }
                        JSArray purchases = new JSArray();
                        for (Purchase purchase : inventory.getAllPurchases()) {
                            purchases.put(purchaseToJson(purchase));
                        }
                        JSArray products = new JSArray();
                        for (SkuDetails details : inventory.getAllProducts()) {
                            JSObject item = new JSObject();
                            item.put("sku", details.getSku());
                            item.put("price", details.getPrice());
                            item.put("title", details.getTitle());
                            item.put("description", details.getDescription());
                            item.put("type", details.getType());
                            products.put(item);
                        }
                        JSObject output = new JSObject();
                        output.put("purchases", purchases);
                        output.put("products", products);
                        call.resolve(output);
                    });
                } catch (Exception error) {
                    operationInProgress = false;
                    call.reject("بازیابی خریدهای مایکت ناموفق بود.", "RESTORE_FAILED", error);
                }
            }

            @Override
            public void failed(String message, String code, Integer response) {
                rejectWithResponse(call, message, code, response);
            }
        });
    }

    @PluginMethod
    public void consume(PluginCall call) {
        final String publicKey = clean(call.getString("publicKey", ""));
        final String originalJson = call.getString("originalJson", "");
        final String signature = call.getString("signature", "");
        final String itemType = call.getString("itemType", IabHelper.ITEM_TYPE_INAPP);
        if (publicKey.isEmpty() || originalJson == null || originalJson.isEmpty()) {
            call.reject("اطلاعات خرید برای مصرف‌کردن ناقص است.", "INVALID_INPUT");
            return;
        }
        if (operationInProgress) {
            call.reject("یک عملیات پرداخت دیگر در حال انجام است.", "BILLING_BUSY");
            return;
        }

        final Purchase purchase;
        try {
            purchase = new Purchase(itemType, originalJson, signature == null ? "" : signature);
        } catch (JSONException error) {
            call.reject("ساختار رسید خرید معتبر نیست.", "INVALID_RECEIPT", error);
            return;
        }

        ensureSetup(publicKey, new SetupCallback() {
            @Override
            public void ready() {
                operationInProgress = true;
                try {
                    helper.consumeAsync(purchase, (consumed, result) -> {
                        operationInProgress = false;
                        if (result == null || result.isFailure()) {
                            rejectResult(call, result, "نهایی‌سازی خرید مایکت ناموفق بود.", "CONSUME_FAILED");
                            return;
                        }
                        JSObject output = new JSObject();
                        output.put("consumed", true);
                        output.put("sku", consumed == null ? purchase.getSku() : consumed.getSku());
                        call.resolve(output);
                    });
                } catch (Exception error) {
                    operationInProgress = false;
                    call.reject("نهایی‌سازی خرید مایکت ناموفق بود.", "CONSUME_FAILED", error);
                }
            }

            @Override
            public void failed(String message, String code, Integer response) {
                rejectWithResponse(call, message, code, response);
            }
        });
    }

    private void ensureSetup(String publicKey, SetupCallback callback) {
        if (setupReady && helper != null && publicKey.equals(configuredKey)) {
            callback.ready();
            return;
        }
        if (setupInProgress) {
            callback.failed("راه‌اندازی پرداخت مایکت در حال انجام است.", "SETUP_BUSY", null);
            return;
        }
        if (!isMarketInstalled()) {
            callback.failed("فروشگاه برنامه روی دستگاه نصب نیست.", "STORE_NOT_INSTALLED", null);
            return;
        }

        disposeHelper();
        configuredKey = publicKey;
        helper = new IabHelper(getContext(), publicKey);
        helper.enableDebugLogging(BuildConfig.DEBUG);
        setupInProgress = true;
        getActivity().runOnUiThread(() -> {
            try {
                helper.startSetup(result -> {
                    setupInProgress = false;
                    if (result != null && result.isSuccess()) {
                        setupReady = true;
                        callback.ready();
                    } else {
                        setupReady = false;
                        callback.failed(
                            result == null ? "راه‌اندازی پرداخت مایکت ناموفق بود." : result.getMessage(),
                            "SETUP_FAILED",
                            result == null ? null : result.getResponse()
                        );
                    }
                });
            } catch (Exception error) {
                setupInProgress = false;
                setupReady = false;
                callback.failed("راه‌اندازی پرداخت مایکت ناموفق بود.", "SETUP_FAILED", null);
            }
        });
    }

    private JSObject purchaseToJson(Purchase purchase) {
        JSObject output = new JSObject();
        output.put("sku", purchase.getSku());
        output.put("token", purchase.getToken());
        output.put("orderId", purchase.getOrderId());
        output.put("packageName", purchase.getPackageName());
        output.put("purchaseTime", purchase.getPurchaseTime());
        output.put("purchaseState", purchase.getPurchaseState());
        output.put("developerPayload", purchase.getDeveloperPayload());
        output.put("originalJson", purchase.getOriginalJson());
        output.put("signature", purchase.getSignature());
        output.put("itemType", purchase.getItemType());
        return output;
    }

    private void rejectResult(PluginCall call, IabResult result, String fallback, String code) {
        rejectWithResponse(
            call,
            result == null || result.getMessage() == null ? fallback : result.getMessage(),
            code,
            result == null ? null : result.getResponse()
        );
    }

    private void rejectWithResponse(PluginCall call, String message, String code, Integer response) {
        JSObject data = new JSObject();
        if (response != null) data.put("response", response);
        call.reject(message, code, data);
    }

    private String clean(String value) {
        return value == null ? "" : value.trim();
    }

    private boolean isMarketInstalled() {
        try {
            getContext().getPackageManager().getApplicationInfo(BuildConfig.MARKET_PACKAGE, 0);
            return true;
        } catch (PackageManager.NameNotFoundException error) {
            return false;
        }
    }

    private void disposeHelper() {
        if (helper != null) {
            try {
                helper.dispose();
            } catch (Exception ignored) {
            }
        }
        helper = null;
        setupReady = false;
        setupInProgress = false;
        operationInProgress = false;
    }

    @Override
    protected void handleOnDestroy() {
        disposeHelper();
        super.handleOnDestroy();
    }
}
