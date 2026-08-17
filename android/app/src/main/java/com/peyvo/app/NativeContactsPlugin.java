package com.peyvo.app;

import android.app.Activity;
import android.content.Intent;
import android.database.Cursor;
import android.provider.ContactsContract;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Opens Android's system contact picker. ACTION_PICK grants access only to
 * the single contact selected by the user, so the app never requests broad
 * READ_CONTACTS permission or reads the address book in the background.
 */
@CapacitorPlugin(name = "NativeContacts")
public class NativeContactsPlugin extends Plugin {
    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(
            Intent.ACTION_PICK,
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI
        );
        startActivityForResult(call, intent, "contactPicked");
    }

    @ActivityCallback
    private void contactPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("انتخاب مخاطب لغو شد", "CONTACT_CANCELLED");
            return;
        }

        String[] projection = {
            ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
            ContactsContract.CommonDataKinds.Phone.NUMBER
        };

        try (Cursor cursor = getContext().getContentResolver().query(
            result.getData().getData(), projection, null, null, null
        )) {
            if (cursor == null || !cursor.moveToFirst()) {
                call.reject("شماره مخاطب خوانده نشد", "CONTACT_EMPTY");
                return;
            }
            String name = cursor.getString(0);
            String phone = cursor.getString(1);
            JSObject response = new JSObject();
            response.put("name", name == null ? "" : name);
            response.put("phone", phone == null ? "" : phone);
            call.resolve(response);
        } catch (Exception error) {
            call.reject("خواندن مخاطب ناموفق بود", "CONTACT_READ_FAILED", error);
        }
    }
}
