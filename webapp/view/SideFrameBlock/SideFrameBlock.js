sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var SideFrameBlock = BlockBase.extend("com.nscorp.car.componentid.view.SideFrameBlock.SideFrame", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.SideFrameBlock.SideFrame",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.SideFrameBlock.SideFrame",
					type: ViewType.XML
				}
			}
		}
	});
	return SideFrameBlock;
}, true);