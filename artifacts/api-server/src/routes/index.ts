import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import storiesRouter from "./stories";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(storiesRouter);

export default router;
