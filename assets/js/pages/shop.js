// Shop: the products by app (Lightroom, Photoshop, Field Guides), the comparison and the bundles. The page is static
// (tools/build_pages.py); here the header, the prices set in the admin, the cart and the reviews.
import { initChrome } from "../lib/ui.js";
import { initPrices } from "../lib/prices.js";
import "../lib/reviews.js";

initChrome();
initPrices();
