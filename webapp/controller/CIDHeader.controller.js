sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"com/nscorp/car/componentid/model/RepairLine",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessageToast"
], function (BaseController, RepairLine, JSONModel, MessageBox, MessageToast) {
	"use strict";

	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.CIDHeader", {

		onRetrievePress: function (oEvent) {
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

				var sPath = this.getModel().createKey("/ComponentSet", {
					"ComponentId": cidHeader.cid,
					"Location": cidHeader.location,
					"Responsibility": cidHeader.responsibility,
					"CarMark": cidHeader.carMark
				});

				sap.ui.getCore().getMessageManager().removeAllMessages();
				oModel.read(sPath, {
					success: function (oData, response) {
						this.getModel("addCIDView").setProperty("/busy", false);

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

						// clone original data returned by Railinc Web Service
						var oDataClone = JSON.parse(JSON.stringify(oData));
						oViewModel.setProperty("/oCloneData", oDataClone);


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

		onRegisterPress: function () {
			var cidHeader = this.getModel("addCIDView").getProperty("/cidHeader");
			var oViewModel = this.getModel("addCIDView");

			if (cidHeader.cid === "" && cidHeader.location !== "" && cidHeader.responsibility !== "") {
				oViewModel.setProperty("/componentTypeSetVisible", true);
				oViewModel.setProperty("/footerSetVisible", true);
				this.getView().byId("idComponentId").setEditable(false);
				this.getView().byId("idRepairRespCode").setEditable(false);
				this.getView().byId("idComponentType").setEditable(true);
				this.getView().byId("idLocation").setEditable(false);

			} else {
				sap.m.MessageBox.error("Please Enter Location and Responsibility");
			}
		},

		onComponentTypeChange: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var resp = this.getModel("addCIDView").getProperty("/response");

			if (resp.ComponentType === "" || typeof resp.ComponentType === "undefined") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				this.getView().byId("idComponentType").setEditable(false);
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
		}

		
	});
}());