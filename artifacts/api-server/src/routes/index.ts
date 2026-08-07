import { Router, type IRouter } from "express";
import healthRouter from "./health";
import pulseRouter from "./pulse";

const router: IRouter = Router();

router.use(healthRouter);
router.use(pulseRouter);

export default router;
