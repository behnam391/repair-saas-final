"use client";

import { useState } from "react";
import { enamadQuery } from "@/lib/enamad";

export default function EnamadImage({ id, code, width = 125, height = 136 }: { id: string; code: string; width?: number; height?: number }) {
  const official = `https://trustseal.enamad.ir/logo.aspx?${enamadQuery(id, code)}`;
  const [src, setSrc] = useState(official);

  return (
    <img
      referrerPolicy="origin"
      src={src}
      alt="نماد اعتماد الکترونیکی پیوو"
      width={width}
      height={height}
      decoding="async"
      onError={() => setSrc("/images/trust/enamad-peyvo-official.png")}
      style={{ cursor: "pointer", width, height, objectFit: "contain" }}
    />
  );
}
