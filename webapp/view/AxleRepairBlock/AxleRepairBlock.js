sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var AxleRepairBlock = BlockBase.extend("com.nscorp.car.componentid.view.AxleRepairBlock.AxleRepair", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.AxleRepairBlock.AxleRepair",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.AxleRepairBlock.AxleRepair",
					type: ViewType.XML
				}
			}
		}
	});
	return AxleRepairBlock;
}, true);