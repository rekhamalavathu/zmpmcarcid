sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var AppWheelReadBlock = BlockBase.extend("com.nscorp.car.componentid.view.AppWheelReadBlock.AppWheelRead", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.AppWheelReadBlock.AppWheelRead",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.AppWheelReadBlock.AppWheelRead",
					type: ViewType.XML
				}
			}
		}
	});
	return AppWheelReadBlock;
}, true);