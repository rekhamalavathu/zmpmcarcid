sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/Device",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageItem",
	"com/nscorp/car/componentid/model/formatter",
	"sap/ui/core/routing/History",
	"sap/m/MessageToast"
], function (BaseController, Device, JSONModel, MessageBox, MessagePopover, Link, MessageItem, formatter, History, MessageToast) {
	"use strict";

	return BaseController.extend("com.nscorp.car.componentid.controller.AddCID", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the controller is instantiated.
		 * @public
		 */
		onInit: function () {
			// set view model
			this.setModel(this._createViewModel(), "addCIDView");
			this.getView().addEventDelegate({
				onAfterShow: function () {
					var oComponentData = this.getOwnerComponent().getComponentData();

					if (oComponentData && oComponentData.startupParameters.CarMark && oComponentData.startupParameters.Guid) {
						this.getModel("addCIDView").setProperty("/cidHeader/carMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/response/CarMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/cidHeader/guid", oComponentData.startupParameters.Guid[0]);
						this.getModel("addCIDView").setProperty("/response/Guid", oComponentData.startupParameters.Guid[0]);
						this._onObjectMatched();
					}
				}.bind(this)
			});

			// Register the view with the message manager
			var oView = this.getView();
			sap.ui.getCore().getMessageManager();
			sap.ui.getCore().getMessageManager().removeAllMessages();
			oView.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
			sap.ui.getCore().getMessageManager().registerObject(oView, true);

			this.getView().addEventDelegate({
				onAfterShow: function () {
					this.getModel("addCIDView").setProperty("/wheelSetVisible", false);
					this.getModel("addCIDView").setProperty("/bolsterSetVisible", false);
					this.getModel("addCIDView").setProperty("/couplerSetVisible", false);
					this.getModel("addCIDView").setProperty("/emerValveSetVisible", false);
					this.getModel("addCIDView").setProperty("/servValveSetVisible", false);
					this.getModel("addCIDView").setProperty("/sideFrameSetVisible", false);
					this.getModel("addCIDView").setProperty("/slackAdjusterSetVisible", false);
				}.bind(this)
			});

			this.getModel("addCIDView").setProperty("busy", false);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * @public
		 */
		onSavePress: function () {

			this.getModel("addCIDView").setProperty("/busy", true);
			var oModel = this.getView().getModel();
			var oResponse = this.getModel("addCIDView").getProperty("/response");
			var oHeader = this.getModel("addCIDView").getProperty("/cidHeader");
			var oOriData = this.getModel("addCIDView").getProperty("/oCloneData");
			var sMessage;

			// get Header Data
			this.getModel("addCIDView").setProperty("/response/Guid", oHeader.guid);
			this.getModel("addCIDView").setProperty("/response/CarMark", oHeader.carMark);
			this.getModel("addCIDView").setProperty("/response/Responsibility", oHeader.responsibility);
			this.getModel("addCIDView").setProperty("/response/Location", oHeader.location);

			if (JSON.stringify(oOriData) === JSON.stringify(oResponse)) {
				this.getModel("addCIDView").setProperty("/response/UpdateFlag", false);
			} else {
				this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
				this._checkMandatoryField(oResponse);
			}
			var updateFlag = this.getModel("addCIDView").getProperty("/response/UpdateFlag");

			oResponse.to_Message = [];

			sap.ui.getCore().getMessageManager().removeAllMessages();
			oModel.create("/ComponentSet", oResponse, {
				method: "POST",
				success: function (oData, resp) {
					var oViewModel = this.getModel("addCIDView");
					var sMessageLength = oData.to_Message.results.length;

					if (sMessageLength === 0) {
						if (updateFlag === true) {
							oViewModel.setProperty("/response", oData);
							var newComponentId = this.getModel("addCIDView").getProperty("/response/ComponentId");
							this.getModel("addCIDView").setProperty("/cidHeader/cid", newComponentId);
							sMessage = this.getView().getModel("i18n").getResourceBundle().getText("message.componentRegistered");
							this.getModel("addCIDView").setProperty("/busy", false);
						} else {
							sMessage = this.getView().getModel("i18n").getResourceBundle().getText("message.componentSaved");
							this.getModel("addCIDView").setProperty("/busy", false);
						}
						MessageToast.show(sMessage, {
							duration: 2000,
							onClose: function () {
								this.onNavBack();
							}.bind(this)
						});
					} else {
						for (var i = 0; i < oData.to_Message.results.length; i++) {
							sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
								message: oData.to_Message.results[i].ResponseMessage,
								persistent: true,
								type: sap.ui.core.MessageType.Error
							}));
						}
						this.getModel("addCIDView").setProperty("/busy", false);
					}

				}.bind(this),
				error: function (oError) {
					this.getModel("addCIDView").setProperty("/busy", false);
					var oMessage = sap.ui.getCore().getMessageManager().getMessageModel().getData(),
						sMsg = oMessage[1].message;

					MessageBox.error(sMsg);
				}.bind(this)

			});
		},

		onMsgIndPress: function (oEvent) {
			if (!this._oMessagePopover) {
				this._oMessagePopover = sap.ui.xmlfragment(this.getView().getId(), "com.nscorp.car.componentid.view.fragment.MessagePopOver",
					this);
				this.getView().addDependent(this._oMessagePopover);
			}
			this._oMessagePopover.openBy(oEvent.getSource());

		},

		getNewRepairConfigMatNumber: function () {
			return {
				AppliedJobCodeCheck: "",
				AppliedJobCode: "",
				ConditionCodeCheck: "",
				ConditionCode: "",
				MaterialCostRequired: "",
				MaterialNumRequired: "",
				SearchTable: ""
			};
		},

		getNewRepairConfigMatCond: function () {
			return {
				MaterialCodeCheck: "",
				MaterialCode: "",
				ConditionCode: ""
			};
		},

		getNewRepairConfigMatCost: function () {
			return {
				AppliedJobCodeCheck: "",
				AppliedJobCode: "",
				EnableFlag: ""
			};
		},

		getNewRepairConfigApplQual: function () {
			return {
				JobCodeOpTypeIDCheck: "",
				JobCodeOpTypeID: "",
				SearchTable: "",
				SearchExclusion: ""
			};
		},

		getNewRepairConfigMatReservation: function () {
			return {
				ConditionCodeCheck: "",
				ConditionCode: "",
				SpecialStock: "",
				Vendor: "",
				LocationField: ""
			};
		},

		addObjectToModel: function (oModel, sProperty, oObject) {
			var aItems = oModel.getProperty(sProperty);
			aItems.push(oObject);
			oModel.setProperty(sProperty, aItems);

			//return latest item index based on Model
			return aItems.length - 1;
		},

		onNavBack: function () {
			// navigate to previous screen
			sap.ui.getCore().byId("backBtn").firePress();

		},
		/*
		/**
		 * Handle when icon tab bar is selected
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from Icon Tab Bar select
	   */

		/**
		 * Handle when track item table update finished
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from Track Item Table update finished
		 */

		/**
		 * Handle on search field live change
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from Search Field
		 */

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
				busy: true,
				busyDelay: 0,
				componentTypeSetVisible: false,
				wheelSetVisible: true,
				bolsterSetVisible: true,
				couplerSetVisible: true,
				emerValveSetVisible: true,
				servValveSetVisible: true,
				sideFrameSetVisible: true,
				slackAdjusterSetVisible: true,
				hasChange: false,
				buttonSetEnable: false,
				editSetEnable: false,
				footerSetVisible: false,

				cidHeader: {
					cid: "",
					location: "",
					responsibility: "",
					compType: "",
					carMark: "",
					guid: ""
				},

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
				},

				response: {},
				oCloneData: {},
				oCloneData2: {}

			});
		},

		_onObjectMatched: function (oEvent) {
			var sPath,
				oObject,
				aFilter,
				oComponentData = this.getOwnerComponent().getComponentData();

			this.getModel().callFunction("/GetCurrentUser", {
				method: "GET",
				success: function (oData, response) {
					this.getModel("WOModel").setProperty("/CurrentUser", oData.GetCurrentUser.Value);

					sPath = "/ZMPM_CDS_CAR_USERSTATIONS";
					if (oComponentData && oComponentData.startupParameters.StationNumber) {
						aFilter = [new sap.ui.model.Filter({
								path: "zuser",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: oData.GetCurrentUser.Value,
								and: true
							}),
							new sap.ui.model.Filter({
								path: "stationnum",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: oComponentData.startupParameters.StationNumber
							})
						];
					} else {
						aFilter = [new sap.ui.model.Filter({
								path: "zuser",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: oData.GetCurrentUser.Value,
								and: true
							}),
							new sap.ui.model.Filter({
								path: "default_station",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: "X"
							})
						];
					}

					this.getModel().read(sPath, {
						urlParameters: {
							"$expand": "to_StationsData,to_WcsLocData"
						},
						filters: aFilter,
						success: function (oDataStation) {
							this.getModel("WOModel").setProperty("/StationNumber", oDataStation.results[0].stationnum);
							this.getModel("WOModel").setProperty("/StationName", oDataStation.results[0].stationname);
							this.getModel("WOModel").setProperty("/SPLC", oDataStation.results[0].to_StationsData.splccode);
							this.getModel("WOModel").setProperty("/RepairsLocation", oDataStation.results[0].to_WcsLocData.repairsloc);
							this.getModel("WOModel").setProperty("/WheelsetsLocation", oDataStation.results[0].to_WcsLocData.wheelsetsloc);
							this.getModel("WOModel").setProperty("/Plant", oDataStation.results[0].to_WcsLocData.plant);
							this.getModel("WOModel").setProperty("/MainWorkCenter", oDataStation.results[0].to_WcsLocData.mainworkcenter);

						}.bind(this),
						error: function (sMsg) {

						}
					});
				}.bind(this),
				error: function (oError) {

				}
			});

			//Get Applied Qualifier Rule config
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_AQUAL";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigApplQual();
						oObject.JobCodeOpTypeIDCheck = oData.results[i].JobCodeOpTypeIDCheck;
						oObject.JobCodeOpTypeID = oData.results[i].JobCodeOpTypeID;
						oObject.SearchTable = oData.results[i].SearchTable;
						oObject.SearchExclusion = oData.results[i].SearchExclusion;
						this.addObjectToModel(this.getModel("RepairConfig"), "/AppliedQualifier", oObject);
					}
				}.bind(this),
				error: function (sMsg) {

				}
			});

			//Get Material Number Rule config
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_MATNR";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigMatNumber();
						oObject.AppliedJobCodeCheck = oData.results[i].AppliedJobCodeCheck;
						oObject.AppliedJobCode = oData.results[i].AppliedJobCode;
						oObject.ConditionCodeCheck = oData.results[i].ConditionCodeCheck;
						oObject.ConditionCode = oData.results[i].ConditionCode;
						oObject.MaterialCostRequired = oData.results[i].MaterialCostRequired;
						oObject.MaterialNumRequired = oData.results[i].MaterialNumRequired;
						oObject.SearchTable = oData.results[i].SearchTable;
						this.addObjectToModel(this.getModel("RepairConfig"), "/MaterialNumber", oObject);
					}
				}.bind(this),
				error: function (sMsg) {

				}
			});

			//Get Material Condition Code Rule configType
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_MACOND";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigMatCond();
						oObject.MaterialCodeCheck = oData.results[i].MaterialCodeCheck;
						oObject.MaterialCode = oData.results[i].MaterialCode;
						oObject.ConditionCode = oData.results[i].ConditionCode;
						this.addObjectToModel(this.getModel("RepairConfig"), "/MaterialConditionCode", oObject);
					}
				}.bind(this),
				error: function (sMsg) {

				}
			});

			//Get Material Cost Rule config
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_MACOST";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigMatCost();
						oObject.AppliedJobCodeCheck = oData.results[i].AppliedJobCodeCheck;
						oObject.AppliedJobCode = oData.results[i].AppliedJobCode;
						oObject.EnableFlag = oData.results[i].EnableFlag;
						this.addObjectToModel(this.getModel("RepairConfig"), "/MaterialCost", oObject);
					}
				}.bind(this),
				error: function (sMsg) {

				}
			});

			//Get Material Reservation Rule
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_MATRES";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigMatReservation();
						oObject.ConditionCodeCheck = oData.results[i].ConditionCodeCheck;
						oObject.ConditionCode = oData.results[i].ConditionCode;
						oObject.SpecialStock = oData.results[i].SpecialStock;
						oObject.Vendor = oData.results[i].Vendor;
						oObject.LocationField = oData.results[i].LocationField;
						this.addObjectToModel(this.getModel("RepairConfig"), "/MaterialReservation", oObject);
					}
				}.bind(this),
				error: function (sMsg) {

				}
			});

		},

		_checkMandatoryField: function (oResponse) {
			// check if required fields has data
			if (oResponse.WheelSetFlag === true) {
				if (oResponse.WsFacilityCode === "" || oResponse.AwSerialNoLeft === "" || oResponse.AwSerialNoRight === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("error.requiredField"));
				}
			}

			if (oResponse.BolsterFlag === true) {
				if (oResponse.BolsterCastMonth === "" || oResponse.BolsterAarDesignCode === "" || oResponse.BolsterMfgPatternNo === "" ||
					oResponse.BolsterWearPlate === "" || oResponse.BolsterCastYear === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("error.requiredField"));
				}
			}

			if (oResponse.CouplerFlag === true) {
				if (oResponse.CouplerCastMonth === "" || oResponse.CouplerClassDate === "" || oResponse.CouplerCastYear === "" ||
					oResponse.CouplerCavityNo === "" || oResponse.CouplerAarFacilityCode === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("requiredField"));
				}
			}

			if (oResponse.EmerValveFlag === true) {
				if (oResponse.EvConditionCode === "" || oResponse.EvPartNo === "" || oResponse.EvValveType === "" ||
					oResponse.EvAarCode === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("requiredField"));
				}
			}

			if (oResponse.ServValveFlag === true) {
				if (oResponse.SvConditionCode === "" || oResponse.SvPartNo === "" || oResponse.SvValveType === "" ||
					oResponse.SvAarCode === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("requiredField"));
				}
			}
			if (oResponse.SideFrameFlag === true) {
				if (oResponse.SfCastMonth === "" || oResponse.SfAarDesignCode === "" || oResponse.SfMfgPatternNo === "" ||
					oResponse.SfWearPlate === "" || oResponse.SfButtonCount === "" || oResponse.SfAarCode === "" ||
					oResponse.SfCastYear === "" || oResponse.SfNominalWheelBase === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("requiredField"));
				}
			}

			if (oResponse.SlakAdjustFlag === true) {
				if (oResponse.SaConditionCode === "" || oResponse.SaReconditionDate === "" || oResponse.SaOemModelNo === "" ||
					oResponse.SaManufacturer === "") {
					sap.m.MessageBox.error(this.getResourceBundle().getText("requiredField"));
				}
			}

		}

	});

});