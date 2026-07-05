import { Router, type IRouter } from "express";
import healthRouter from "./health";
import catalogRouter from "./catalog";
import storiesRouter from "./stories";
import cantonsRouter from "./cantons";
import routeSagasRouter from "./routeSagas";
import aerialwaysRouter from "./aerialways";
import poisRouter from "./pois";
import poiStoryRouter from "./poiStory";
import weatherRouter from "./weather";
import profileRouter from "./profile";
import narrationRouter from "./narration";
import geocodeRouter from "./geocode";
import customRouteRouter from "./customRoute";

const router: IRouter = Router();

router.use(healthRouter);
router.use(catalogRouter);
router.use(storiesRouter);
router.use(cantonsRouter);
router.use(routeSagasRouter);
router.use(aerialwaysRouter);
router.use(poisRouter);
router.use(poiStoryRouter);
router.use(weatherRouter);
router.use(profileRouter);
router.use(narrationRouter);
router.use(geocodeRouter);
router.use(customRouteRouter);

export default router;
