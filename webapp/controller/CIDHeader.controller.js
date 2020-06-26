sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (BaseController, JSONModel, MessageBox, MessageToast) {
	"use strict";

	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.CIDHeader", {
		
//	PM00001423 - Add Barcode scan for Component ID
		/*onScanPress: function (oEvent) {
			var _self = this;
			jQuery.sap.require("sap.ndc.BarcodeScanner");
			sap.ndc.BarcodeScanner.scan(
				function (mResult) {
					alert("We got a bar code\n" +
						"Result: " + mResult.text + "\n" +
						"Format: " + mResult.format + "\n" +
						"Cancelled: " + mResult.cancelled);
					_self.getView().byId("idComponentId").setValue(mResult.text);
				},
				function (Error) {
					alert("Scanning failed: " + Error);
				},
				function (mParams) {
					alert("Value entered: " + mParams.newValue);
				}
			);

		},*/
//PM00001423 - End
		/**
		 * perform Component Lookup web service call when Retrieve Button is clicked
		 * @public
		 */
		onRetrievePress: function () {
			this.getModel("addCIDView").setProperty("/busy", true);
			var oModel = this.getView().getModel();
			var cidHeader = this.getModel("addCIDView").getProperty("/cidHeader");

			if (cidHeader.cid === "" || cidHeader.location === "" || cidHeader.responsibility === "") {
				this.getModel("addCIDView").setProperty("/busy", false);
				sap.m.MessageBox.error("Please Enter Component ID, Location and Responsibility");
			} else {
				this.getView().byId("retrieveButton").setEnabled(true);
				this.getView().byId("idComponentId").setEditable(false);
				this.getView().byId("idRepairRespCode").setEditable(false);
				this.getView().byId("idComponentType").setEditable(false);
				this.getView().byId("idLocation").setEditable(false);
				this.getModel("addCIDView").setProperty("/componentTypeEnable", false);

				var sPath = this.getModel().createKey("/ComponentSet", {
					"ComponentId": cidHeader.cid,
					"Location": cidHeader.location,
					"Responsibility": cidHeader.responsibility,
					"CarMark": cidHeader.carMark
				});

				sap.ui.getCore().getMessageManager().removeAllMessages();
				oModel.read(sPath, {
					success: function (oData, response) {

						var oMessage = sap.ui.getCore().getMessageManager().getMessageModel().getData();
						if (oMessage.length === 0) {

							this._padDates(oData);

							var oViewModel = this.getModel("addCIDView");
							oViewModel.setProperty("/wheelSetVisible", oData.WheelSetFlag);
							oViewModel.setProperty("/bolsterSetVisible", oData.BolsterFlag);
							oViewModel.setProperty("/couplerSetVisible", oData.CouplerFlag);
							oViewModel.setProperty("/emerValveSetVisible", oData.EmerValveFlag);
							oViewModel.setProperty("/servValveSetVisible", oData.ServValveFlag);
							oViewModel.setProperty("/sideFrameSetVisible", oData.SideFrameFlag);
							oViewModel.setProperty("/slackAdjusterSetVisible", oData.SlakAdjustFlag);
							oViewModel.setProperty("/componentTypeSetVisible", true);
							oViewModel.setProperty("/footerSetVisible", true);
							oViewModel.setProperty("/editSetEnable", true);
							oViewModel.setProperty("/buttonSetEnable", true);
							oViewModel.setProperty("/response", oData);
							oViewModel.setProperty("/response/Guid", cidHeader.guid);
							// this.getModel("WOModel").setProperty("/Response", oData);
							// Initial load for RJC for Wheel Set Component type
							if (oData.ComponentType === "WHEELSET") {
								sap.ui.getCore().getEventBus().publish("onLoadRemovedJobCode");
								sap.ui.getCore().getEventBus().publish("onLoadRemovedJobCodeLeft");
							}

							// clone original data returned by Railinc Web Service
							var oDataClone = JSON.parse(JSON.stringify(oData));
							oViewModel.setProperty("/oCloneData", oDataClone);
						} else {
							this.getView().byId("retrieveButton").setEnabled(true);
							this.getView().byId("idComponentId").setEditable(true);
							this.getView().byId("idRepairRespCode").setEditable(true);
							this.getView().byId("idComponentType").setEditable(true);
							this.getView().byId("idLocation").setEditable(true);
						}
						this.getModel("addCIDView").setProperty("/busy", false);
					}.bind(this),
					error: function (oError) {
						this.getModel("addCIDView").setProperty("/busy", false);
						this.getView().byId("retrieveButton").setEnabled(true);
						this.getView().byId("idComponentId").setEditable(true);
						this.getView().byId("idRepairRespCode").setEditable(true);
						this.getView().byId("idComponentType").setEditable(true);
						this.getView().byId("idLocation").setEditable(true);

					}.bind(this)
				});
			}
		},

		/**
		 * perform validation check when Register Button is clicked
		 * @public
		 */
		onRegisterPress: function () {
			var cidHeader = this.getModel("addCIDView").getProperty("/cidHeader");
			var oViewModel = this.getModel("addCIDView");
			var sMessage;

			if (cidHeader.cid === "" && cidHeader.location !== "" && cidHeader.responsibility !== "") {
				oViewModel.setProperty("/componentTypeSetVisible", true);
				oViewModel.setProperty("/footerSetVisible", true);
				this.getView().byId("idComponentId").setEditable(false);
				this.getView().byId("idRepairRespCode").setEditable(false);
				this.getView().byId("idComponentType").setEditable(true);
				this.getView().byId("idLocation").setEditable(false);

			} else {
				if (cidHeader.cid !== "") {
					sMessage = this.getView().getModel("i18n").getResourceBundle().getText("error.registerCid");
					sap.m.MessageBox.error(sMessage);
				} else {
					sMessage = this.getView().getModel("i18n").getResourceBundle().getText("error.registerLocationResp");
					sap.m.MessageBox.error(sMessage);
				}
			}
		},

		/**
		 * set the component type flag for corresponding component sections upon the change of Component Type
		 * @public
		 * @param {Object} oEvent - Event object from Component Type drop down
		 */
		onComponentTypeChange: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var resp = this.getModel("addCIDView").getProperty("/response");

			sap.ui.getCore().getMessageManager().removeAllMessages();
			this._resetComponentFlag(resp);

			if (resp.ComponentType === "" || typeof resp.ComponentType === "undefined") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				// this.getView().byId("idComponentType").setEditable(false);
				this.getModel("addCIDView").setProperty("/componentTypeEnable", false);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				this.getModel("addCIDView").setProperty("/wheelSetVisible", false);
				this.getModel("addCIDView").setProperty("/bolsterSetVisible", false);
				this.getModel("addCIDView").setProperty("/couplerSetVisible", false);
				this.getModel("addCIDView").setProperty("/emerValveSetVisible", false);
				this.getModel("addCIDView").setProperty("/servValveSetVisible", false);
				this.getModel("addCIDView").setProperty("/sideFrameSetVisible", false);
				this.getModel("addCIDView").setProperty("/slackAdjusterSetVisible", false);

				if (resp.ComponentType === "WHEELSET") {
					this.getModel("addCIDView").setProperty("/wheelSetVisible", true);
				}

				if (resp.ComponentType === "BOLSTER") {
					this.getModel("addCIDView").setProperty("/bolsterSetVisible", true);
				}

				if (resp.ComponentType === "COUPLER") {
					this.getModel("addCIDView").setProperty("/couplerSetVisible", true);
				}

				if (resp.ComponentType === "EMERVALVE") {
					this.getModel("addCIDView").setProperty("/emerValveSetVisible", true);
				}

				if (resp.ComponentType === "SERVVALVE") {
					this.getModel("addCIDView").setProperty("/servValveSetVisible", true);
				}

				if (resp.ComponentType === "SIDEFRAME") {
					this.getModel("addCIDView").setProperty("/sideFrameSetVisible", true);
				}

				if (resp.ComponentType === "SLAKADJUST") {
					this.getModel("addCIDView").setProperty("/slackAdjusterSetVisible", true);
				}
			}
		},

		/**
		 * perform validation check when Responsibility Code is change
		 * @public
		 * @param {Object} oEvent - Event object from Responsibility Code drop down
		 */
		onChangeResponsibilityCode: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var header = this.getModel("addCIDView").getProperty("/cidHeader");

			if (header.responsibility === "" || typeof header.responsibility === "undefined") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
			}
		},

		/**
		 * perform validation check when Location Code is change
		 * @public
		 * @param {Object} oEvent - Event object from Location Code drop down
		 */
		onChangeLocation: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var header = this.getModel("addCIDView").getProperty("/cidHeader");

			if (header.location === "" || typeof header.location === "undefined") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		/**
		 * Creates the model for the view
		 * @private
		 * @return {sap.ui.model.json.JSONModel} JSON Model
		 */
		_createViewModel: function () {
			return new JSONModel({
				comboBoxValues: {
					ResponsibilityCode: [],
					AppliedJobCode: [],
					AppliedQualifier: [],
					ConditionCode: [],
					MaterialNumber: [],
					RemovedJobCode: [],
					RemovedQualifier: [],
					WhyMadeCode: [],
					Location: []
				}
			});
		},

		/**
		 * reset component flag upon change of component type 
		 * @private
		 * @param {Object} oResponse - Component object
		 */
		_resetComponentFlag: function (oResponse) {
			oResponse.WheelSetFlag = false;
			oResponse.BolsterFlag = false;
			oResponse.SideFrameFlag = false;
			oResponse.CouplerFlag = false;
			oResponse.EmerValveFlag = false;
			oResponse.ServValveFlag = false;
			oResponse.SlakAdjustFlag = false;
		},
		
		/**
		 * Pad date strings with 0
		 * @private
		 * @param {Object} oComponent - Component object
		 **/
		 _padDates: function (oComponent) {
			var aDateFields = [	"RwStampedMonthLeft", "RwStampedYearLeft", "RwStampedMonthRight", "RwStampedYearRight",
								"AwStampedMonthLeft", "AwStampedYearLeft", "AwStampedMonthRight", "AwStampedYearRight"];
			
			aDateFields.forEach(function (sDateField) {
				if (oComponent[sDateField] !== "") {
					oComponent[sDateField] = ("00" + oComponent[sDateField]).slice(-2);
				}
			});
		 }
	});
}());