import * as catalogDataNs from "./catalog-data.js";

const catalogData = "default" in catalogDataNs ? catalogDataNs.default : catalogDataNs;

export const {
  DEFAULT_SKETCH,
  EMPTY_SKETCH,
  HELPER_TEMPLATE,
  API_GLOSSARY,
  PRIMITIVE_COLUMN_HELP,
  INPUT_DOCUMENT_HELP,
  SETUP_DRAW_GUIDE,
  EXAMPLES
} = catalogData;

export default catalogData;
