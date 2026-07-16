import { Router, type IRouter } from "express";
import { LANDING_PAGE_HTML } from "../lib/landingPageHtml";
import { PARTNER_LANDING_HTML } from "../lib/partnerLandingHtml";

const router: IRouter = Router();

router.get("/", (_req, res) => {
  res.type("html").send(LANDING_PAGE_HTML);
});

router.get("/partner", (_req, res) => {
  res.type("html").send(PARTNER_LANDING_HTML);
});

export default router;
