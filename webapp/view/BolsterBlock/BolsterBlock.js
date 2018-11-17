sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var BolsterBlock = BlockBase.extend("com.nscorp.car.componentid.view.BolsterBlock.Bolster", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.BolsterBlock.Bolster",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.BolsterBlock.Bolster",
					type: ViewType.XML
				}
			}
		}
	});
	return BolsterBlock;
}, true);