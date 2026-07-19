import { Router, type IRouter } from "express";
import { ROUTES_EXPLORER_HTML } from "../lib/routesExplorerHtml";

const router: IRouter = Router();

router.get("/", (_req, res): void => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=300");
  res.send(ROUTES_EXPLORER_HTML);
});

export default router;
