sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var WheelRepairBlock = BlockBase.extend("com.nscorp.car.componentid.view.WheelRepairBlock.WheelRepair", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.WheelRepairBlock.WheelRepair",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.WheelRepairBlock.WheelRepair",
					type: ViewType.XML
				}
			}
		}
	});
	return WheelRepairBlock;
}, true);