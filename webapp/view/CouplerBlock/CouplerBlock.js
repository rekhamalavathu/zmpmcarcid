sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var CouplerBlock = BlockBase.extend("com.nscorp.car.componentid.view.CouplerBlock.Coupler", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.CouplerBlock.Coupler",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.CouplerBlock.Coupler",
					type: ViewType.XML
				}
			}
		}
	});
	return CouplerBlock;
}, true);