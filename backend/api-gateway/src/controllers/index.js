/** Builds every controller from the service layer. */
import { createAssetController } from './assetController.js';
import { createExperimentController } from './experimentController.js';
import { createHealthController } from './healthController.js';
import { createImageController } from './imageController.js';
import { createInsightController } from './insightController.js';
import { createModelController } from './modelController.js';
import { createRunController } from './runController.js';

export function createControllers(services) {
  return {
    healthController: createHealthController(services),
    imageController: createImageController(services),
    modelController: createModelController(services),
    assetController: createAssetController(services),
    experimentController: createExperimentController(services),
    runController: createRunController(services),
    insightController: createInsightController(services),
  };
}
