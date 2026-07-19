declare module "react-neshan-map-leaflet" {
  import { ComponentType } from "react";
  const NeshanMap: ComponentType<{
    options: {
      key: string;
      maptype?: string;
      poi?: boolean;
      traffic?: boolean;
      center: [number, number];
      zoom?: number;
    };
    onInit?: (L: any, map: any) => void;
    style?: React.CSSProperties;
  }>;
  export default NeshanMap;
}
