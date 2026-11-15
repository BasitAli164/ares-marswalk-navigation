  // ARES configuration and shared constants.
  export const STORAGE_KEY = "ares.savedPlaces";

  export const DEFAULT_ROUTE_START = {
    lat: 18.4446,
    lon: 77.4509,
    name: "Jezero Base"
  };

  export const MARS_WKID = 104971;
  export const MARS_RADIUS_KM = 3389.5;
  export const EVA_SPEED_KMH = 2.2;

  export const HAZARD_THRESHOLDS = {
    LOW: 5,
    MODERATE: 12
  };

  export const ARCGIS_URLS = {
    elevation: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDEM200M/ImageServer",
    imagery: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MDIM/MapServer",
    relief: "https://astro.arcgis.com/arcgis/rest/services/OnMars/MColorDEM/MapServer",
    craters: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/Mars_Nomenclature_Mountains/FeatureServer"
  };
