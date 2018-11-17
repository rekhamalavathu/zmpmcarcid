sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var EmerValveBlock = BlockBase.extend("com.nscorp.car.componentid.view.EmerValveBlock.EmerValve", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.EmerValveBlock.EmerValve",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.EmerValveBlock.EmerValve",
					type: ViewType.XML
				}
			}
		}
	});
	return EmerValveBlock;
}, true);