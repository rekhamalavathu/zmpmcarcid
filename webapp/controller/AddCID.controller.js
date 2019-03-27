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
			this._onObjectMatched();
			this.getView().addEventDelegate({
				onAfterShow: function () {
					var oComponentData = this.getOwnerComponent().getComponentData();

					if (oComponentData && oComponentData.startupParameters.CarMark && oComponentData.startupParameters.Guid && oComponentData.startupParameters
						.OrderType) {
						this.getModel("addCIDView").setProperty("/cidHeader/carMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/response/CarMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/cidHeader/guid", oComponentData.startupParameters.Guid[0]);
						this.getModel("addCIDView").setProperty("/response/Guid", oComponentData.startupParameters.Guid[0]);
						this.getModel("WOModel").setProperty("/WOHeader/BadOrderStatus", oComponentData.startupParameters.OrderType[0]);
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

			sap.ui.getCore().getMessageManager().removeAllMessages();

			// get Header Data
			this.getModel("addCIDView").setProperty("/response/Guid", oHeader.guid);
			this.getModel("addCIDView").setProperty("/response/CarMark", oHeader.carMark);
			this.getModel("addCIDView").setProperty("/response/Responsibility", oHeader.responsibility);
			this.getModel("addCIDView").setProperty("/response/Location", oHeader.location);
			this.getModel("addCIDView").setProperty("/hasError", false);
			this._setComponentFlag(oResponse);

			// check if any mandatory field is blank 
			this._checkMandatoryField(oResponse);
			if ((this.getModel("addCIDView").getProperty("/hasError")) === true) {
				this.getModel("addCIDView").setProperty("/busy", false);
				return;
			}
			// check if any changes has been made to component data
			if (JSON.stringify(oOriData) === JSON.stringify(oResponse)) {
				this.getModel("addCIDView").setProperty("/response/UpdateFlag", false);
			} else {
				this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);

			}
			var updateFlag = this.getModel("addCIDView").getProperty("/response/UpdateFlag");

			oResponse.to_Message = [];

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
							duration: 1500,
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
				componentTypeEnable: true,
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
				hasError: false,

				cidHeader: {
					cid: "",
					location: "",
					responsibility: "",
					compType: "",
					carMark: "",
					guid: "",
					OrderType: ""
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
							if (oDataStation.results.length === 0) {
								this.noStationAssign();
								return;
							}
							this.getModel("WOModel").setProperty("/StationNumber", oDataStation.results[0].to_StationsData.stationnum);
							this.getModel("WOModel").setProperty("/StationName", oDataStation.results[0].to_StationsData.stationname);
							this.getModel("WOModel").setProperty("/SPLC", oDataStation.results[0].to_StationsData.splccode);
							this.getModel("WOModel").setProperty("/RepairsLocation", oDataStation.results[0].to_WcsLocData.repairsloc);
							this.getModel("WOModel").setProperty("/WheelsetsLocation", oDataStation.results[0].to_WcsLocData.cnsgnmntsloc);
							this.getModel("WOModel").setProperty("/ProgramLocation", oDataStation.results[0].to_WcsLocData.programsloc);
							this.getModel("WOModel").setProperty("/Plant", oDataStation.results[0].to_WcsLocData.plant);
							this.getModel("WOModel").setProperty("/MainWorkCenter", oDataStation.results[0].to_WcsLocData.mainworkcenter);
						}.bind(this)
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

		_setComponentFlag: function (oResponse) {
			switch (oResponse.ComponentType) {
			case "WHEELSET":
				oResponse.WheelSetFlag = true;
				break;
			case "BOLSTER":
				oResponse.BolsterFlag = true;
				break;
			case "SIDEFRAME":
				oResponse.SideFrameFlag = true;
				break;
			case "COUPLER":
				oResponse.CouplerFlag = true;
				break;
			case "EMERVALVE":
				oResponse.EmerValveFlag = true;
				break;
			case "SERVVALVE":
				oResponse.ServValveFlag = true;
				break;
			case "SLAKADJUST":
				oResponse.SlakAdjustFlag = true;
				break;
			}
		},

		_checkMandatoryField: function (oResponse) {
			// check WheelSet mandatory fields
			if (oResponse.WheelSetFlag === true) {
				if (oResponse.WsFacilityCode === "" || oResponse.WsFacilityCode === undefined || oResponse.AwSerialNoLeft === "" || oResponse.AwSerialNoLeft ===
					undefined || oResponse.AwSerialNoRight === "" || oResponse.AwSerialNoRight === undefined || oResponse.RwStampedMonthLeft === "" ||
					oResponse.RwStampedMonthLeft ===
					undefined || oResponse.RwStampedYearLeft === "" || oResponse.RwStampedYearLeft === undefined || oResponse.RwMfgLeft === "" ||
					oResponse.RwMfgLeft ===
					undefined || oResponse.RwScaleLeft === "" || oResponse.RwScaleLeft === undefined || oResponse.RwFingerLeft === "" || oResponse.RwFingerLeft ===
					undefined || oResponse.RwStampedMonthRight === "" || oResponse.RwStampedMonthRight === undefined || oResponse.RwStampedYearRight ===
					"" ||
					oResponse.RwStampedYearRight === undefined || oResponse.RwMfgRight === "" || oResponse.RwMfgRight === undefined || oResponse.RwScaleRight ===
					"" || oResponse.RwScaleRight ===
					undefined || oResponse.RwFingerRight === "" || oResponse.RwFingerRight === undefined || oResponse.AwStampedMonthLeft === "" ||
					oResponse.AwStampedMonthLeft ===
					undefined || oResponse.AwStampedYearLeft === "" || oResponse.AwStampedYearLeft === undefined || oResponse.AwMfgLeft === "" ||
					oResponse.AwMfgLeft ===
					undefined || oResponse.AwScaleLeft === "" || oResponse.AwScaleLeft === undefined || oResponse.AwFingerLeft === "" || oResponse.AwFingerLeft ===
					undefined || oResponse.AwStampedMonthRight === "" || oResponse.AwStampedMonthRight === undefined || oResponse.AwStampedYearRight ===
					"" ||
					oResponse.AwStampedYearRight === undefined || oResponse.AwMfgRight === "" || oResponse.AwMfgRight === undefined || oResponse.AwScaleRight ===
					"" || oResponse.AwScaleRight ===
					undefined || oResponse.AwFingerRight === "" || oResponse.AwFingerRight === undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.WsFacilityCode === "" || oResponse.WsFacilityCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/WsFacilityCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwSerialNoLeft === "" || oResponse.AwSerialNoLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwSerialNoLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwSerialNoRight === "" || oResponse.AwSerialNoRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwSerialNoRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwStampedMonthLeft === "" || oResponse.AwStampedMonthLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwStampedMonthLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwStampedYearLeft === "" || oResponse.AwStampedYearLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwStampedYearLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwMfgLeft === "" || oResponse.AwMfgLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwMfgLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwScaleLeft === "" || oResponse.AwScaleLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwScaleLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwFingerLeft === "" || oResponse.AwFingerLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwFingerLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwStampedMonthRight === "" || oResponse.AwStampedMonthRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwStampedMonthRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwStampedYearRight === "" || oResponse.AwStampedYearRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwStampedYearRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwMfgRight === "" || oResponse.AwMfgRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwMfgRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwScaleRight === "" || oResponse.AwScaleRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwScaleRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.AwFingerRight === "" || oResponse.AwFingerRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/AwFingerRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwStampedMonthLeft === "" || oResponse.RwStampedMonthLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwStampedMonthLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwStampedYearLeft === "" || oResponse.RwStampedYearLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwStampedYearLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwMfgLeft === "" || oResponse.RwMfgLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwMfgLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwScaleLeft === "" || oResponse.RwScaleLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwScaleLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwFingerLeft === "" || oResponse.RwFingerLeft === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwFingerLeft",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwStampedMonthRight === "" || oResponse.RwStampedMonthRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwStampedMonthRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwStampedYearRight === "" || oResponse.RwStampedYearRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwStampedYearRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwMfgRight === "" || oResponse.RwMfgRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwMfgRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwScaleRight === "" || oResponse.RwScaleRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwScaleRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.RwFingerRight === "" || oResponse.RwFingerRight === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/RwFingerRight",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}

				}
			}
			// Check Bolster mandatory field
			if (oResponse.BolsterFlag === true) {
				if (oResponse.BolsterCastMonth === "" || oResponse.BolsterCastMonth === undefined || oResponse.BolsterAarDesignCode === "" ||
					oResponse.BolsterAarDesignCode === undefined || oResponse.BolsterMfgPatternNo === "" || oResponse.BolsterMfgPatternNo ===
					undefined || oResponse.BolsterWearPlate === "" || oResponse.BolsterWearPlate === undefined || oResponse.BolsterCastYear === "" ||
					oResponse.BolsterCastYear === undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.BolsterCastMonth === "" || oResponse.BolsterCastMonth === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterCastMonth",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.BolsterCastYear === "" || oResponse.BolsterCastYear === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterCastYear",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.BolsterAarDesignCode === "" || oResponse.BolsterAarDesignCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterAarDesignCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.BolsterMfgPatternNo === "" || oResponse.BolsterMfgPatternNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterMfgPatternNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.BolsterWearPlate === "" || oResponse.BolsterWearPlate === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterWearPlate",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
			// Check Coupler mandatory field
			if (oResponse.CouplerFlag === true) {
				if (oResponse.CouplerCastMonth === "" || oResponse.CouplerCastMonth === undefined || oResponse.CouplerCastYear === "" || oResponse
					.CouplerCastYear === undefined ||
					oResponse.CouplerCavityNo === "" || oResponse.CouplerCavityNo === undefined || oResponse.CouplerAarFacilityCode === "" ||
					oResponse.CouplerAarFacilityCode === undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.CouplerCastMonth === "" || oResponse.CouplerCastMonth === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/CouplerCastMonth",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.CouplerCastYear === "" || oResponse.CouplerCastYear === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/CouplerCastYear",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.CouplerCavityNo === "" || oResponse.CouplerCavityNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/CouplerCavityNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.CouplerAarFacilityCode === "" || oResponse.CouplerAarFacilityCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/CouplerAarFacilityCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
			// Check Emergency Valve mandatory field
			if (oResponse.EmerValveFlag === true) {
				if (oResponse.EvConditionCode === "" || oResponse.EvConditionCode === undefined || oResponse.EvPartNo === "" || oResponse.EvPartNo ===
					undefined || oResponse.EvValveType === "" || oResponse.EvValveType === undefined || oResponse.EvAarCode === "" || oResponse.EvAarCode ===
					undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.EvConditionCode === "" || oResponse.EvConditionCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/EvConditionCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.EvPartNo === "" || oResponse.EvPartNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/EvPartNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.EvValveType === "" || oResponse.EvValveType === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/EvValveType",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.EvAarCode === "" || oResponse.EvAarCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/EvAarCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
			// Check Service Valve mandatory field
			if (oResponse.ServValveFlag === true) {
				if (oResponse.SvConditionCode === "" || oResponse.SvConditionCode === undefined || oResponse.SvPartNo === "" || oResponse.SvPartNo ===
					undefined || oResponse.SvValveType === "" ||
					oResponse.SvValveType === undefined || oResponse.SvAarCode === "" || oResponse.SvAarCode === undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.SvConditionCode === "" || oResponse.SvConditionCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SvConditionCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SvPartNo === "" || oResponse.SvPartNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SvPartNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SvValveType === "" || oResponse.SvValveType === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SvValveType",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SvAarCode === "" || oResponse.SvAarCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SvAarCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
			// Check Side Frame mandatory field
			if (oResponse.SideFrameFlag === true) {
				if (oResponse.SfCastMonth === "" || oResponse.SfCastMonth === undefined || oResponse.SfAarDesignCode === "" || oResponse.SfAarDesignCode ===
					undefined ||
					oResponse.SfMfgPatternNo === "" || oResponse.SfMfgPatternNo === undefined || oResponse.SfWearPlate === "" || oResponse.SfWearPlate ===
					undefined ||
					oResponse.SfButtonCount === "" || oResponse.SfButtonCount === undefined || oResponse.SfAarCode === "" || oResponse.SfAarCode ===
					undefined ||
					oResponse.SfCastYear === "" || oResponse.SfCastYear === undefined || oResponse.SfNominalWheelBase === "" || oResponse.SfNominalWheelBase ===
					undefined || oResponse.SfButtonCount === 0) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.SfButtonCount === "" || oResponse.SfButtonCount === "0" || oResponse.SfButtonCount === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfButtonCount",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfNominalWheelBase === "" || oResponse.SfNominalWheelBase === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfNominalWheelBase",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfAarCode === "" || oResponse.SfAarCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfAarCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfWearPlate === "" || oResponse.SfWearPlate === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfWearPlate",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}

					if (oResponse.SfCastMonth === "" || oResponse.SfCastMonth === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfCastMonth",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfCastYear === "" || oResponse.SfCastYear === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfCastYear",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfAarDesignCode === "" || oResponse.SfAarDesignCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfAarDesignCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SfMfgPatternNo === "" || oResponse.SfMfgPatternNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SfMfgPatternNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}

			// Check Slack Adjuster mandatory field
			if (oResponse.SlakAdjustFlag === true) {
				if (oResponse.SaConditionCode === "" || oResponse.SaConditionCode === undefined || oResponse.SaOemModelNo === "" || oResponse.SaOemModelNo ===
					undefined) {
					this.getModel("addCIDView").setProperty("/hasError", true);

					if (oResponse.SaConditionCode === "" || oResponse.SaConditionCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SaConditionCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
					if (oResponse.SaOemModelNo === "" || oResponse.SaOemModelNo === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/SaOemModelNo",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
		}
	});
});