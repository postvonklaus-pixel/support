'use strict';

import { createStockFormController } from './stock-form.js';

const controller = createStockFormController({
  containerId: 'wareneingang-body',
  addRowBtnId: 'wareneingang-add-row',
  submitBtnId: 'wareneingang-submit',
  scanBtnId: 'wareneingang-scan',
  movementType: 'in',
  actionLabel: 'Wareneingang',
});

export const render = controller.render;
export const presetProduct = controller.presetProduct;
