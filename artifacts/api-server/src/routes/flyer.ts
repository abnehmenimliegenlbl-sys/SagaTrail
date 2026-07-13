import { readFileSync } from "fs";
import { resolve } from "path";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/flyer", (_req, res) => {
  try {
    const html = readFileSync(
      resolve(__dirname, "../../../wordpress/tourist-flyer.html"),
      "utf8",
    );
    res.type("html").send(html);
  } catch {
    res.status(404).send("Flyer nicht gefunden");
  }
});

export default router;
