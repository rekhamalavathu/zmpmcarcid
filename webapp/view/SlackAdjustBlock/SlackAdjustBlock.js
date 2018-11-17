sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var SlackAdjustBlock = BlockBase.extend("com.nscorp.car.componentid.view.SlackAdjustBlock.SlackAdjust", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.SlackAdjustBlock.SlackAdjust",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.SlackAdjustBlock.SlackAdjust",
					type: ViewType.XML
				}
			}
		}
	});
	return SlackAdjustBlock;
}, true);