sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var WheelSetBlock = BlockBase.extend("com.nscorp.car.componentid.view.WheelSetBlock.WheelSet", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.WheelSetBlock.WheelSet",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.WheelSetBlock.WheelSet",
					type: ViewType.XML
				}
			}
		}
	});
	return WheelSetBlock;
}, true);