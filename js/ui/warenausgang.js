'use strict';

import { createStockFormController } from './stock-form.js';

const controller = createStockFormController({
  containerId: 'warenausgang-body',
  addRowBtnId: 'warenausgang-add-row',
  submitBtnId: 'warenausgang-submit',
  scanBtnId: 'warenausgang-scan',
  movementType: 'out',
  actionLabel: 'Warenausgang',
});

export const render = controller.render;
export const presetProduct = controller.presetProduct;
