import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import productsRouter from "./products";
import variantsRouter from "./variants";
import searchRouter from "./search";
import reviewsRouter from "./reviews";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import notificationsRouter from "./notifications";
import pushSubscriptionsRouter from "./push-subscriptions";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import sellerApplicationsRouter from "./seller-applications";
import sellersRouter from "./sellers";
import messagingRouter from "./messaging";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(searchRouter);
router.use(productsRouter);
router.use(variantsRouter);
router.use(reviewsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(notificationsRouter);
router.use(pushSubscriptionsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(sellerApplicationsRouter);
router.use(sellersRouter);
router.use(messagingRouter);

export default router;
