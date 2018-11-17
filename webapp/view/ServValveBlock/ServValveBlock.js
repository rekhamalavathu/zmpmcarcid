sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var ServValveBlock = BlockBase.extend("com.nscorp.car.componentid.view.ServValveBlock.ServValve", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.ServValveBlock.ServValve",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.ServValveBlock.ServValve",
					type: ViewType.XML
				}
			}
		}
	});
	return ServValveBlock;
}, true);