import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import storiesRouter from "./stories";
import cantonsRouter from "./cantons";
import routeSagasRouter from "./routeSagas";
import aerialwaysRouter from "./aerialways";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(storiesRouter);
router.use(cantonsRouter);
router.use(routeSagasRouter);
router.use(aerialwaysRouter);

export default router;
