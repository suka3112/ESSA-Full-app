import { NextFunction } from "express";
import { BaseController } from "./baseController";
import slaService, { SlaProblemsError, toInstanceDto } from "../helpers/sla.service";
import slaEngine from "../helpers/slaEngine.service";
import logger from "../utils/logger";

class SlaController extends BaseController {
  private actor(req: any) {
    return {
      userId: Number(req?.user?.id) || 0,
      name: String(req?.user?.name || "").trim(),
    };
  }

  private handle(error: any, res: any, next: NextFunction) {
    if (error instanceof SlaProblemsError) {
      return res.status(400).json({ message: error.message, problems: error.problems });
    }
    logger.error("Error:", error);
    next(error);
  }

  async meta(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.meta();
      return this.success(req, res, this.status.HTTP_OK, data, "SLA meta retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async listPolicies(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.listPolicies();
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policies retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async createPolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.createPolicy(req.body || {}, this.actor(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "SLA policy created");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async getPolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.getPolicy(req.params.id);
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async updatePolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.updatePolicy(req.params.id, req.body || {}, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy updated");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async deletePolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.deletePolicy(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy deleted");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async publishPolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.publishPolicy(req.params.id, this.actor(req));
      try {
        await slaEngine.backfillMissingClocks();
      } catch (error) {
        logger.warn("SLA backfill after publish failed", error);
      }
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy published");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async markTested(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.markTested(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy marked tested");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async newVersion(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.newVersion(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "SLA policy version created");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async clonePolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.clonePolicy(req.params.id, req.body || {}, this.actor(req));
      return this.success(req, res, this.status.HTTP_CREATED, data, "SLA policy cloned");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async retirePolicy(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.retirePolicy(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA policy retired");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async createCalendar(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.createCalendar(this.actor(req), req.body || {});
      return this.success(req, res, this.status.HTTP_CREATED, data, "SLA calendar created");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async updateCalendar(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.updateCalendar(
        req.params.id,
        req.body || {},
        this.actor(req),
      );
      return this.success(req, res, this.status.HTTP_OK, data, "SLA calendar updated");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async publishCalendar(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.publishCalendar(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA calendar published");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async retireCalendar(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.retireCalendar(req.params.id, this.actor(req));
      return this.success(req, res, this.status.HTTP_OK, data, "SLA calendar retired");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async simulate(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.simulate(req.body || {});
      return this.success(req, res, this.status.HTTP_OK, data, "SLA simulation completed");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async listInstances(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.listInstances(req.query || {});
      return this.success(req, res, this.status.HTTP_OK, data, "SLA instances retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async summarizeInstances(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.summarizeInstances();
      return this.success(req, res, this.status.HTTP_OK, data, "SLA instance summary retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async getInstance(req: any, res: any, next: NextFunction) {
    try {
      const data = await slaService.getInstance(req.params.id);
      return this.success(req, res, this.status.HTTP_OK, data, "SLA instance retrieved");
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async pauseInstance(req: any, res: any, next: NextFunction) {
    try {
      const row = await slaEngine.pauseInstance(
        req.params.id,
        String(req.body?.code || "ON_HOLD"),
        req.body?.reason != null ? String(req.body.reason) : null,
        this.actor(req),
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        toInstanceDto(row),
        "SLA instance paused",
      );
    } catch (error) {
      this.handle(error, res, next);
    }
  }

  async resumeInstance(req: any, res: any, next: NextFunction) {
    try {
      const row = await slaEngine.resumeInstance(
        req.params.id,
        String(req.body?.event || "RESUME"),
        this.actor(req),
      );
      return this.success(
        req,
        res,
        this.status.HTTP_OK,
        toInstanceDto(row),
        "SLA instance resumed",
      );
    } catch (error) {
      this.handle(error, res, next);
    }
  }
}

export default new SlaController();
