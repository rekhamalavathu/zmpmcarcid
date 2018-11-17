sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var BearingRepairBlock = BlockBase.extend("com.nscorp.car.componentid.view.BearingRepairBlock.BearingRepair", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.BearingRepairBlock.BearingRepair",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.BearingRepairBlock.BearingRepair",
					type: ViewType.XML
				}
			}
		}
	});
	return BearingRepairBlock;
}, true);