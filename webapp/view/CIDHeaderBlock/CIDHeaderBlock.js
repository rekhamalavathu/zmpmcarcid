sap.ui.define(["sap/ui/core/library", "sap/uxap/BlockBase"], function (coreLibrary, BlockBase) {
	"use strict";

	var ViewType = coreLibrary.mvc.ViewType;

	var CIDHeaderBlock = BlockBase.extend("com.nscorp.car.componentid.view.CIDHeaderBlock.CIDHeader", {
		metadata: {
			views: {
				Collapsed: {
					viewName: "com.nscorp.car.componentid.view.CIDHeaderBlock.CIDHeader",
					type: ViewType.XML
				},
				Expanded: {
					viewName: "com.nscorp.car.componentid.view.CIDHeaderBlock.CIDHeader",
					type: ViewType.XML
				}
			}
		}
	});
	return CIDHeaderBlock;
}, true);