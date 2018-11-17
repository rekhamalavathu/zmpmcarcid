sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var RemWheelReadBlock = BlockBase.extend("com.nscorp.car.componentid.view.RemWheelReadBlock.RemWheelRead", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.RemWheelReadBlock.RemWheelRead",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.RemWheelReadBlock.RemWheelRead",
					type: ViewType.XML
				}
			}
		}
	});
	return RemWheelReadBlock;
}, true);