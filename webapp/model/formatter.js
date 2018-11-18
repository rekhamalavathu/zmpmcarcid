sap.ui.define([], function () {
	"use strict";
	return {
		formatStationName: function (sStationName) {
			if(sStationName){
				return this.getView().getModel("i18n").getResourceBundle().getText("carDetail.StationName") + ": " + sStationName;
			} else {
				return "";
			}
		}
	};
});