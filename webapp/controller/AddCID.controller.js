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
			this._loadRJCRulesMap();
			this._loadRJCWhyMadeMap();
			// fetch Car Mark, GUID and Bad Order Status from Repair screen
			this.getView().addEventDelegate({
				onAfterShow: function () {
					var oComponentData = this.getOwnerComponent().getComponentData();
					if (oComponentData && oComponentData.startupParameters.CarMark && oComponentData.startupParameters.Guid && oComponentData.startupParameters
						.OrderType && oComponentData.startupParameters.PriceMasterID) {
						this.getModel("addCIDView").setProperty("/cidHeader/carMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/response/CarMark", oComponentData.startupParameters.CarMark[0]);
						this.getModel("addCIDView").setProperty("/cidHeader/guid", oComponentData.startupParameters.Guid[0]);
						this.getModel("addCIDView").setProperty("/response/Guid", oComponentData.startupParameters.Guid[0]);
						this.getModel("WOModel").setProperty("/WOHeader/BadOrderStatus", oComponentData.startupParameters.OrderType[0]);
						this.getModel("addCIDView").setProperty("/cidHeader/priceMasterId", oComponentData.startupParameters.PriceMasterID[0]);
						if (oComponentData.startupParameters.RepairDate) {
							this.getModel("addCIDView").setProperty("/cidHeader/repairDate", new Date(oComponentData.startupParameters.RepairDate[0]));
						} else {
							this.getModel("addCIDView").setProperty("/cidHeader/repairDate", new Date());
						}
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

			// this.getModel("addCIDView").setProperty("/busy", false);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */
		/**
		 * Handle when Save Button is clicked
		 * @public
		 */
		onSavePress: function () {
			// Perform Field Registration Web Service call
			this.getModel("addCIDView").setProperty("/busy", true);
			
			var oResponse = this.getModel("addCIDView").getProperty("/response");
			var oHeader = this.getModel("addCIDView").getProperty("/cidHeader");
			var oOriData = this.getModel("addCIDView").getProperty("/oCloneData");
			

			sap.ui.getCore().getMessageManager().removeAllMessages();

			// get Header Data
			this.getModel("addCIDView").setProperty("/response/Guid", oHeader.guid);
			this.getModel("addCIDView").setProperty("/response/CarMark", oHeader.carMark);
			this.getModel("addCIDView").setProperty("/response/Responsibility", oHeader.responsibility);
			this.getModel("addCIDView").setProperty("/response/Location", oHeader.location);
			this.getModel("addCIDView").setProperty("/hasError", false);
			this._setComponentFlag(oResponse);

			// check if any mandatory field is blank 
			this._checkMandatoryFieldWheelSet(oResponse, oOriData);
			this._checkMandatoryFieldBolster(oResponse);
			this._checkMandatoryFieldCoupler(oResponse);
			this._checkMandatoryFieldEmergencyValve(oResponse);
			this._checkMandatoryFieldServiceValve(oResponse);
			this._checkMandatoryFieldSideFrame(oResponse);
			this._checkMandatoryFieldSlackAdjuster(oResponse);
			this._checkMandatoryFieldsMD11();
			this._checkMandatoryFieldsMD115();

			if ((this.getModel("addCIDView").getProperty("/hasError")) === true) {
				this.getModel("addCIDView").setProperty("/busy", false);
				return;
			}
			
			// If MD11 or MD115, first send all reports to Railinc. Need success before submitting to /ComponentSet
			if (this.getModel("addCIDView").getProperty("/md11RequiredLeft")) {
				this._submitMD11Report("Left");
			} else if (this.getModel("addCIDView").getProperty("/md11RequiredRight")) {
				this._submitMD11Report("Right");
			} else if (this.getModel("addCIDView").getProperty("/md115RequiredLeft")) {
				this._submitMD115Report("Left");
			} else if (this.getModel("addCIDView").getProperty("/md115RequiredRight")) {
				this._submitMD115Report("Right");
			} else {
				this._registerComponent();
			}
		},
		
		_registerComponent: function () {
			var updateFlag = this.getModel("addCIDView").getProperty("/response/UpdateFlag");
			var oResponse = this.getModel("addCIDView").getProperty("/response");
			var oOriData = this.getModel("addCIDView").getProperty("/oCloneData");
			var oModel = this.getView().getModel();
			
			var sMessage;

			// check if any changes has been made to component data to trigger CREG field registration
			if (oResponse.ComponentType !== "WHEELSET") {
				if (JSON.stringify(oOriData) === JSON.stringify(oResponse)) {
					this.getModel("addCIDView").setProperty("/response/UpdateFlag", false);
				} else {
					this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
				}
			}

			oResponse.to_Message = [];
			//perform Component Field Registration
			oModel.create("/ComponentSet", oResponse, {
				method: "POST",
				success: function (oData, resp) {
					var oViewModel = this.getModel("addCIDView");
					var sMessageLength = oData.to_Message.results.length;
					// fetch registration result
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
						//show a message toast if the registration is successful
						MessageToast.show(sMessage, {
							duration: 1500,
							onClose: function () {
								this.onNavBack();
							}.bind(this)
						});
					} else {
						//fetch error message and register to message manager
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
				//fetch error message and register to message manager
				error: function (oError) {
					this.getModel("addCIDView").setProperty("/busy", false);
					var oMessage = sap.ui.getCore().getMessageManager().getMessageModel().getData(),
						sMsg = oMessage[1].message;
					MessageBox.error(sMsg);
				}.bind(this)

			});
		},

		/**
		 * Handle when message indicator is clicked
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from message indicator
		 */
		onMsgIndPress: function (oEvent) {
			if (!this._oMessagePopover) {
				this._oMessagePopover = sap.ui.xmlfragment(this.getView().getId(), "com.nscorp.car.componentid.view.fragment.MessagePopOver",
					this);
				this.getView().addDependent(this._oMessagePopover);
			}
			this._oMessagePopover.openBy(oEvent.getSource());
		},

		/** 
		 * Method to get new object for Material configuration details for Repair
		 * @public
		 * @return {Array} - Array for Material configuration data
		 */
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

		/**
		 * Method to get new object for Material condition details for Repair
		 * @public
		 * @return {Array} - Array for Material Condition data
		 */
		getNewRepairConfigMatCond: function () {
			return {
				MaterialCodeCheck: "",
				MaterialCode: "",
				ConditionCode: ""
			};
		},

		/**
		 * Method get new  object for configuration details for Repair Material cost
		 * @public
		 * @return {Array} - Array for Material Cost data
		 */
		getNewRepairConfigMatCost: function () {
			return {
				AppliedJobCodeCheck: "",
				AppliedJobCode: "",
				EnableFlag: ""
			};
		},

		/**
		 * Method get new object for configuration details for Applied Qualifier
		 * @public
		 * @return {Array} - Array for Applied Qualifier configuration data
		 */
		getNewRepairConfigApplQual: function () {
			return {
				JobCodeOpTypeIDCheck: "",
				JobCodeOpTypeID: "",
				SearchTable: "",
				SearchExclusion: ""
			};
		},

		/**
		 * Method get new object for configuration details for Repair Material Reservation details
		 * @public
		 * @return {Array} - Array for Material reservation data
		 */
		getNewRepairConfigMatReservation: function () {
			return {
				ConditionCodeCheck: "",
				ConditionCode: "",
				SpecialStock: "",
				Vendor: "",
				LocationField: ""
			};
		},

		/** 
		 * method to generate a new object of Repair Removed Qualifier Rule
		 * @returns {Object} - the object of a Repair Removed Qualifier Rule
		 */
		getNewRepairConfigRemQual: function () {
			return {
				JobCodeOpTypeIDCheck: "",
				JobCodeOpTypeID: "",
				SearchTable: "",
				SearchExclusion: ""
			};
		},

		/**
		 * add object to model.
		 * @public
		 * @param {object} oModel - Model Name
		 * @param {string} sProperty - Property Name
		 * @param {object} oObject - Object
		 * @return {string} aItems - return latest item index 
		 */
		addObjectToModel: function (oModel, sProperty, oObject) {
			var aItems = oModel.getProperty(sProperty);
			aItems.push(oObject);
			oModel.setProperty(sProperty, aItems);

			//return latest item index based on Model
			return aItems.length - 1;
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * @public
		 */
		onNavBack: function () {
			// navigate to previous screen
			sap.ui.getCore().byId("backBtn").firePress();

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
			var oMD11Left = {
				EquipmentSide: "",
				ComponentLocation: "",
				Derailment: "",
				AdapterCondition: "",
				AdtpadCondition: "",
				BearingSize: "",
				BurntOff: "",
				DetectMethod: "",
				DetectionDesc: "",
				WhyMadeCode: "",
				ElasAdtpad: "",
				WheelSnFailedSide: "",
				to_Message: []
			};
			
			var oMD115Left = {
				DefWheelDesig: "",
				EquipmentSide: "",
				DefectLocation: "",
				FlangeFingerReading: "",
				RimThickness: "",
				JournalSize: "",
				WhyMadeCode: "",
				DefectType: "",
				FrontDiscoloration: "",
				BackDiscoloration: "",
				MountDateMm: "",
				MountDateYy: "",
				WheelShopMark: "",
				DefWheelSnNo: "",
				DefManufacMm: "",
				DefManufacYy: "",
				DefWheelManufacturer: "",
				DefMountStamp2Mm: "",
				DefMountStamp2Yy:"",
				DefWhStamp2ShopMark: "",
				DefMountStamp3Mm: "",
				DefMountStamp3Yy: "",
				DefWhStamp3ShopMark: "",
				LockMountShopMark: "",
				NewReconditioned: "",
				RecondShopMark: "",
				LockManufacMm: "",
				LockManufacYy: "",
				BrakeShoeFailedWheel: "",
				BrakeMisalignment: "",
				StuckBrakes: "",
				NumCrackInches: "",
				to_Message: []
			};
			
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
					OrderType: "",
					priceMasterId: ""
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
				
				md11: {
					EquipmentInitial: "",
					EquipmentNumber: "",
					RepairDate: null,
					FailureDate: null,
					Derailment: "",
					BearingSize: "",
					DefectMethod: "",
					DetectionDesc: ""
				},
				
				md115: {
					EquipmentInitial: "",
					EquipmentNumber: "",
					FailureDate: null,
					RepairDate: null,
					DetectMethod: "",
					EquipDerailNo: "",
					AxleLocation: "",
					WheelsetCid: "",
					ClassHeatTreatment: "",
					WheelType: "",
					WheelDiameter: "",
					PlateType: "",
					BodyMountedBrakes: "",
					Comments: ""
				},
				
				md11Left: oMD11Left,
				md11Right: JSON.parse(JSON.stringify(oMD11Left)),
				md11RequiredLeft: false,
				md11RequiredRight: false,
				md11SuccessLeft: false,
				md11SuccessRight: false,
				
				md115Left: oMD115Left,
				md115Right: JSON.parse(JSON.stringify(oMD115Left)),
				md115RequiredLeft: false,
				md115RequiredRight: false,
				md115SuccessLeft: false,
				md115SuccessRight: false,
				
				response: {},
				oCloneData: {}
			});
		},

		/**
		 * Handle Object Matched event
		 * @private
		 * @param {sap.ui.base.Event} oEvent - Event object from previous page
		 */
		_onObjectMatched: function (oEvent) {
			var sPath,
				oObject,
				aFilter;
			// oComponentData = this.getOwnerComponent().getComponentData();

			//get User Station
			this.getModel().callFunction("/GetCurrentUser", {
				method: "GET",
				success: function (oData, response) {
					this.getModel("WOModel").setProperty("/CurrentUser", oData.GetCurrentUser.Value);

					// sPath = "/ZMPM_CDS_CAR_USERSTATIONS";
					sPath = "/ZMPM_CDS_CAR_USER_DATA";
					// if (oComponentData && oComponentData.startupParameters.StationNumber) {
					// 	aFilter = [new sap.ui.model.Filter({
					// 			// path: "zuser",
					// 			path: "user_id",
					// 			operator: sap.ui.model.FilterOperator.EQ,
					// 			value1: oData.GetCurrentUser.Value,
					// 			and: true
					// 		})

					// 	];
					// } else {
					aFilter = [new sap.ui.model.Filter({
							path: "user_id",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oData.GetCurrentUser.Value,
							and: true
						})
						// new sap.ui.model.Filter({
						// 	path: "default_station",
						// 	operator: sap.ui.model.FilterOperator.EQ,
						// 	value1: "X"
						// })
					];
					// }
					this.getModel().read(sPath, {
						urlParameters: {
							"$expand": "to_StationsData,to_WcsLocData"
						},
						filters: aFilter,
						success: function (oDataStation) {
							this.getModel("WOModel").setProperty("/StationNumber", oDataStation.results[0].to_StationsData.stationnum);
							this.getModel("WOModel").setProperty("/StationName", oDataStation.results[0].to_StationsData.stationname);
							this.getModel("WOModel").setProperty("/SPLC", oDataStation.results[0].to_StationsData.splccode);
							this.getModel("WOModel").setProperty("/RepairsLocation", oDataStation.results[0].to_WcsLocData.repairsloc);
							this.getModel("WOModel").setProperty("/WheelsetsLocation", oDataStation.results[0].to_WcsLocData.cnsgnmntsloc);
							this.getModel("WOModel").setProperty("/ProgramLocation", oDataStation.results[0].to_WcsLocData.programsloc);
							this.getModel("WOModel").setProperty("/Plant", oDataStation.results[0].to_WcsLocData.plant);
							this.getModel("addCIDView").setProperty("/busy", false);
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

			//Get Removed Qualifier Rule config
			sPath = "/ZMPM_CDS_CAR_REPAIR_CFG_RQUAL";
			this.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oObject = this.getNewRepairConfigRemQual();
						oObject.JobCodeOpTypeIDCheck = oData.results[i].JobCodeOpTypeIDCheck;
						oObject.JobCodeOpTypeID = oData.results[i].JobCodeOpTypeID;
						oObject.SearchTable = oData.results[i].SearchTable;
						oObject.SearchExclusion = oData.results[i].SearchExclusion;
						this.addObjectToModel(this.getModel("RepairConfig"), "/RemovedQualifier", oObject);
					}
				}.bind(this)
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

		/**
		 * to set Component type flag
		 * @private
		 * @param {object} oResponse - Component details
		 */
		_setComponentFlag: function (oResponse, oOriData) {
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

		/**
		 * to check mandatory fields for Wheel Set during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 * @param {Object} oOriData - Original Data Component data
		 */
		_checkMandatoryFieldWheelSet: function (oResponse, oOriData) {
			// check WheelSet mandatory fields
			if (oResponse.WheelSetFlag === true) {
				// Wheel Set - AJC
				if (oResponse.WsAppliedJobCode === "" || oResponse.WsAppliedJobCode === undefined || oResponse.WsAppliedJobCode === "0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WsAppliedJobCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WsAppliedJobCode !== oOriData.WsAppliedJobCode) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Wheel Set - RJC
				if (oResponse.WsRemovedJobCode === "" || oResponse.WsRemovedJobCode === undefined || oResponse.WsRemovedJobCode === "0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WsRemovedJobCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}

				// Wheel Set - Condition Code
				if (oResponse.WsConditionCode === "" || oResponse.WsConditionCode === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WsConditionCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WsConditionCode !== oOriData.WsConditionCode) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Wheel Set - Why Made
				if (oResponse.WsWhyMadeCode === "" || oResponse.WsWhyMadeCode === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WsWhyMadeCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Wheel Set - Facility Code
				if (oResponse.WsFacilityCode === "" || oResponse.WsFacilityCode === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WsFacilityCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Wheel Set - Material
				if (oResponse.Material === "" || oResponse.Material === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/Material",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}

				// Wheel Repair - AJC left & Right
				if (oResponse.WrAppliedJobCodeLeft === "" || oResponse.WrAppliedJobCodeLeft === undefined || oResponse.WrAppliedJobCodeLeft ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrAppliedJobCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrAppliedJobCodeLeft !== oOriData.WrAppliedJobCodeLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.WrAppliedJobCodeRight === "" || oResponse.WrAppliedJobCodeRight === undefined || oResponse.WrAppliedJobCodeRight ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrAppliedJobCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrAppliedJobCodeRight !== oOriData.WrAppliedJobCodeRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Wheel Repair - Condition Code left & Right
				if (oResponse.WrConditionCodeLeft === "" || oResponse.WrConditionCodeLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrConditionCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrConditionCodeLeft !== oOriData.WrConditionCodeLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.WrConditionCodeRight === "" || oResponse.WrConditionCodeRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrConditionCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrConditionCodeRight !== oOriData.WrConditionCodeRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Wheel Repair - AQ left & Right
				if (oResponse.WrAppQualifierLeft === "" || oResponse.WrAppQualifierLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrAppQualifierLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrAppQualifierLeft !== oOriData.WrAppQualifierLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.WrAppQualifierRight === "" || oResponse.WrAppQualifierRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrAppQualifierRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.WrAppQualifierRight !== oOriData.WrAppQualifierRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Wheel Repair - RJC left & Right
				if (oResponse.WrRemovedJobCodeLeft === "" || oResponse.WrRemovedJobCodeLeft === undefined || oResponse.WrRemovedJobCodeLeft ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrRemovedJobCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.WrRemovedJobCodeRight === "" || oResponse.WrRemovedJobCodeRight === undefined || oResponse.WrRemovedJobCodeRight ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrRemovedJobCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Wheel Repair - RQ left & Right
				if (oResponse.WrRemovedQualifierRight === "" || oResponse.WrRemovedQualifierRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrRemovedQualifierRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.WrRemovedQualifierLeft === "" || oResponse.WrRemovedQualifierLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrRemovedQualifierLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Wheel Repair -why Made left & Right
				if (oResponse.WrWhyMadeCodeLeft === "" || oResponse.WrWhyMadeCodeLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrWhyMadeCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.WrWhyMadeCodeRight === "" || oResponse.WrWhyMadeCodeRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/WrWhyMadeCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}

				// Applied WHeel - Serial No Left & Right
				if (oResponse.AwSerialNoLeft === "" || oResponse.AwSerialNoLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwSerialNoLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwSerialNoLeft !== oOriData.AwSerialNoLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				if (oResponse.AwSerialNoRight === "" || oResponse.AwSerialNoRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwSerialNoRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwSerialNoRight !== oOriData.AwSerialNoRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Stamped Month Left & Right
				if (oResponse.AwStampedMonthLeft === "" || oResponse.AwStampedMonthLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwStampedMonthLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwStampedMonthLeft !== oOriData.AwStampedMonthLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				if (oResponse.AwStampedMonthRight === "" || oResponse.AwStampedMonthRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwStampedMonthRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwStampedMonthRight !== oOriData.AwStampedMonthRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Stamped Year Left & Right
				if (oResponse.AwStampedYearLeft === "" || oResponse.AwStampedYearLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwStampedYearLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwStampedYearLeft !== oOriData.AwStampedYearLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				if (oResponse.AwStampedYearRight === "" || oResponse.AwStampedYearRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwStampedYearRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwStampedYearRight !== oOriData.AwStampedYearRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Applied Wheel Class Left & Rigth
				if (oResponse.AwClassLeft === "" || oResponse.AwClassLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwClassLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwClassLeft !== oOriData.AwClassLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.AwClassRight === "" || oResponse.AwClassRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwClassRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwClassRight !== oOriData.AwClassRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Applied Wheel MFG Left & Right
				if (oResponse.AwMfgLeft === "" || oResponse.AwMfgLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwMfgLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwMfgLeft !== oOriData.AwMfgLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.AwMfgRight === "" || oResponse.AwMfgRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwMfgRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwMfgRight !== oOriData.AwMfgRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Applied Wheel Scale Left & Right
				if (oResponse.AwScaleLeft === "" || oResponse.AwScaleLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwScaleLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwScaleLeft !== oOriData.AwScaleLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				if (oResponse.AwScaleRight === "" || oResponse.AwScaleRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwScaleRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwScaleRight !== oOriData.AwScaleRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Applied Wheel Finger Left & Right
				if (oResponse.AwFingerLeft === "" || oResponse.AwFingerLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwFingerLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwFingerLeft !== oOriData.AwFingerLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				if (oResponse.AwFingerRight === "" || oResponse.AwFingerRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AwFingerRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AwFingerRight !== oOriData.AwFingerRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}

				// Removed Wheel - MM Left & Right
				if (oResponse.RwStampedMonthLeft === "" || oResponse.RwStampedMonthLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwStampedMonthLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwStampedMonthRight === "" || oResponse.RwStampedMonthRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwStampedMonthRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Removed Wheel - YY Left & Right
				if (oResponse.RwStampedYearLeft === "" || oResponse.RwStampedYearLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwStampedYearLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwStampedYearRight === "" || oResponse.RwStampedYearRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwStampedYearRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}

				// Removed Wheel - MFG Left & Right
				if (oResponse.RwMfgLeft === "" || oResponse.RwMfgLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwMfgLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwMfgRight === "" || oResponse.RwMfgRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwMfgRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Removed Wheel - Scale Left & Right
				if (oResponse.RwScaleLeft === "" || oResponse.RwScaleLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwScaleLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwScaleRight === "" || oResponse.RwScaleRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwScaleRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Removed Wheel - Finger Left & Right
				if (oResponse.RwFingerLeft === "" || oResponse.RwFingerLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwFingerLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwFingerRight === "" || oResponse.RwFingerRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwFingerRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}

				// Removed Wheel - Class Left & Right
				if (oResponse.RwClassLeft === "" || oResponse.RwClassLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwClassLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.RwClassRight === "" || oResponse.RwClassRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/RwClassRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Bearing Wheel AJC Left & Right
				if (oResponse.BrAppliedJobCodeLeft === "" || oResponse.BrAppliedJobCodeLeft === undefined || oResponse.BrAppliedJobCodeLeft ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrAppliedJobCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrAppliedJobCodeLeft !== oOriData.BrAppliedJobCodeLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.BrAppliedJobCodeRight === "" || oResponse.BrAppliedJobCodeRight === undefined || oResponse.BrAppliedJobCodeRight ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrAppliedJobCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrAppliedJobCodeRight !== oOriData.BrAppliedJobCodeRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Bearing Wheel Condition Code Left & Right
				if (oResponse.BrConditionCodeLeft === "" || oResponse.BrConditionCodeLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrConditionCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrConditionCodeLeft !== oOriData.BrConditionCodeLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.BrConditionCodeRight === "" || oResponse.BrConditionCodeRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrConditionCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrConditionCodeRight !== oOriData.BrConditionCodeRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Bearing Wheel AQ Left & Right
				if (oResponse.BrAppQualifierLeft === "" || oResponse.BrAppQualifierLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrAppQualifierLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrAppQualifierLeft !== oOriData.BrAppQualifierLeft) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				if (oResponse.BrAppQualifierRight === "" || oResponse.BrAppQualifierRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrAppQualifierRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.BrAppQualifierRight !== oOriData.BrAppQualifierRight) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Bearing Wheel RJC Left & Right
				if (oResponse.BrRemovedJobCodeLeft === "" || oResponse.BrRemovedJobCodeLeft === undefined || oResponse.BrRemovedJobCodeLeft ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrRemovedJobCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.BrRemovedJobCodeRight === "" || oResponse.BrRemovedJobCodeRight === undefined || oResponse.BrRemovedJobCodeRight ===
					"0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrRemovedJobCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Bearing Wheel RQ Left & Right
				if (oResponse.BrRemovedQualifierLeft === "" || oResponse.BrRemovedQualifierLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrRemovedQualifierLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.BrRemovedQualifierRight === "" || oResponse.BrRemovedQualifierRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrRemovedQualifierRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Bearing Wheel Why Made Left & Right
				if (oResponse.BrWhyMadeCodeLeft === "" || oResponse.BrWhyMadeCodeLeft === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrWhyMadeCodeLeft",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				if (oResponse.BrWhyMadeCodeRight === "" || oResponse.BrWhyMadeCodeRight === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/BrWhyMadeCodeRight",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Axle AJC 
				if (oResponse.AxleAppliedJobCode === "" || oResponse.AxleAppliedJobCode === undefined || oResponse.AxleAppliedJobCode === "0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AxleAppliedJobCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AxleAppliedJobCode !== oOriData.AxleAppliedJobCode) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Axle Condition Code
				if (oResponse.AxleConditionCode === "" || oResponse.AxleConditionCode === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AxleConditionCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				} else {
					if (oResponse.AxleConditionCode !== oOriData.AxleConditionCode) {
						this.getModel("addCIDView").setProperty("/response/UpdateFlag", true);
					}
				}
				// Axle RJC
				if (oResponse.AxleRemovedJobCode === "" || oResponse.AxleRemovedJobCode === undefined || oResponse.AxleRemovedJobCode === "0000") {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AxleRemovedJobCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
				// Axle Why Made
				if (oResponse.AxleWhyMadeCode === "" || oResponse.AxleWhyMadeCode === undefined) {
					sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
						message: this.getResourceBundle().getText("error.requiredField"),
						target: "/response/AxleWhyMadeCode",
						processor: this.getModel("addCIDView"),
						persistent: true,
						type: sap.ui.core.MessageType.Error
					}));
					this.getModel("addCIDView").setProperty("/hasError", true);
				}
			}
		},

		/**
		 * to check mandatory fields for Bolster during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldBolster: function (oResponse) {
			// Check Bolster mandatory field
			if (oResponse.BolsterFlag === true) {
				if (oResponse.BolsterCastMonth === "" || oResponse.BolsterCastMonth === undefined || oResponse.BolsterAarDesignCode === "" ||
					oResponse.BolsterAarDesignCode === undefined || oResponse.BolsterMfgPatternNo === "" || oResponse.BolsterMfgPatternNo ===
					undefined || oResponse.BolsterWearPlate === "" || oResponse.BolsterWearPlate === undefined || oResponse.BolsterCastYear === "" ||
					oResponse.BolsterCastYear === undefined || oResponse.BolsterAarCode === "" || oResponse.BolsterAarCode === undefined ) {
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
					if (oResponse.BolsterAarCode === "" || oResponse.BolsterAarCode === undefined) {
						sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
							message: this.getResourceBundle().getText("error.requiredField"),
							target: "/response/BolsterAarCode",
							processor: this.getModel("addCIDView"),
							persistent: true,
							type: sap.ui.core.MessageType.Error
						}));
					}
				}
			}
		},

		/**
		 * to check mandatory fields for Coupler during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldCoupler: function (oResponse) {
			// Check Coupler mandatory field
			if (oResponse.CouplerFlag === true) {
				if (oResponse.CouplerCastMonth === "" || oResponse.CouplerCastMonth === undefined || oResponse.CouplerCastYear === "" || oResponse
					.CouplerCastYear === undefined || oResponse.CouplerCavityNo === "" || oResponse.CouplerCavityNo === undefined || oResponse.CouplerAarFacilityCode ===
					"" ||
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
		},

		/**
		 * to check mandatory fields for Emergency Valve during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldEmergencyValve: function (oResponse) {
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
		},

		/**
		 * to check mandatory fields for Service Valve during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldServiceValve: function (oResponse) {
			// Check Service Valve mandatory field
			if (oResponse.ServValveFlag === true) {
				if (oResponse.SvConditionCode === "" || oResponse.SvConditionCode === undefined || oResponse.SvPartNo === "" || oResponse.SvPartNo ===
					undefined || oResponse.SvValveType === "" || oResponse.SvValveType === undefined || oResponse.SvAarCode === "" || oResponse.SvAarCode ===
					undefined) {
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
		},

		/**
		 * to check mandatory fields for Side Frame during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldSideFrame: function (oResponse) {
			// Check Side Frame mandatory field
			if (oResponse.SideFrameFlag === true) {
				if (oResponse.SfCastMonth === "" || oResponse.SfCastMonth === undefined || oResponse.SfAarDesignCode === "" || oResponse.SfAarDesignCode ===
					undefined || oResponse.SfMfgPatternNo === "" || oResponse.SfMfgPatternNo === undefined || oResponse.SfWearPlate === "" ||
					oResponse.SfWearPlate ===
					undefined || oResponse.SfButtonCount === "" || oResponse.SfButtonCount === undefined || oResponse.SfAarCode === "" || oResponse.SfAarCode ===
					undefined || oResponse.SfCastYear === "" || oResponse.SfCastYear === undefined || oResponse.SfNominalWheelBase === "" ||
					oResponse.SfNominalWheelBase ===
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
		},

		/**
		 * to check mandatory fields for Slack Adjuster during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 */
		_checkMandatoryFieldSlackAdjuster: function (oResponse) {
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
		},
		
		_addCIDFieldError: function (sErrorTargetPath, sErrorMessage) {
			sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
				message: sErrorMessage || this.getResourceBundle().getText("error.requiredField"),
				target: sErrorTargetPath,
				processor: this.getModel("addCIDView"),
				persistent: true,
				type: sap.ui.core.MessageType.Error
			}));
			this.getModel("addCIDView").setProperty("/hasError", true);
		},
		
		_checkMandatoryFieldsMD11: function () {
			if (this.getModel("addCIDView").getProperty("/md11RequiredLeft")) {
				this._checkMandatoryFieldMD11("Left");
			}
			
			if (this.getModel("addCIDView").getProperty("/md11RequiredRight")) {
				this._checkMandatoryFieldMD11("Right");
			}
		},
		
		/**
		 * to check mandatory fields for Wheel Set during Field Registration
		 * @private
		 * @param {Object} oResponse - component details
		 * @param {Object} oOriData - Original Data Component data
		 */
		_checkMandatoryFieldMD11: function (sWheelSide) {
			var oAddCIDViewModel = this.getModel("addCIDView");
			var oMD11 = oAddCIDViewModel.getProperty("/md11" + sWheelSide);
			var oMD11Shared = oAddCIDViewModel.getProperty("/md11");
			
			if (oMD11Shared.FailureDate > new Date(oAddCIDViewModel.getProperty("/cidHeader/repairDate"))) {
				this._addCIDFieldError("/md11/FailureDate", this.getResourceBundle().getText("error.FailureDateAfterRepair"));
			}
			
			if (!oMD11Shared.Derailment) {
				this._addCIDFieldError("/md11/Derailment");
			}
			
			if (!oMD11Shared.BearingSize) {
				this._addCIDFieldError("/md11/BearingSize");
			}
			
			if (!oMD11.AdapterCondition) {
				this._addCIDFieldError("/md11" + sWheelSide + "/AdapterCondition");
			}
			
			if (!oMD11.AdtpadCondition) {
				this._addCIDFieldError("/md11" + sWheelSide + "/AdtpadCondition");
			}
			
			if (!oMD11.BurntOff) {
				this._addCIDFieldError("/md11" + sWheelSide + "/BurntOff");
			}
			
			if (!oMD11.ElasAdtpad) {
				this._addCIDFieldError("/md11" + sWheelSide + "/ElasAdtpad");
			}
		},
		
		_checkMandatoryFieldsMD115: function () {
			if (this.getModel("addCIDView").getProperty("/md115RequiredLeft")) {
				this._checkMandatoryFieldMD115("Left");
			}
			
			if (this.getModel("addCIDView").getProperty("/md115RequiredRight")) {
				this._checkMandatoryFieldMD115("Right");
			}
		},
		
		_checkMandatoryFieldMD115: function (sWheelSide) {
			var oAddCIDViewModel = this.getModel("addCIDView");
			var sOtherSide = (sWheelSide === "Left") ? "Right" : "Left";
			var oMD115 = oAddCIDViewModel.getProperty("/md115" + sWheelSide);
			var oMD115Other = oAddCIDViewModel.getProperty("/md115" + sOtherSide);
			var oMD115Shared = oAddCIDViewModel.getProperty("/md115");
			
			if (!oMD115Shared.FailureDate) {
				this._addCIDFieldError("/md115/FailureDate");
			} else if (oMD115Shared.FailureDate > new Date(oAddCIDViewModel.getProperty("/cidHeader/repairDate"))) {
				this._addCIDFieldError("/md115/FailureDate", this.getResourceBundle().getText("error.FailureDateAfterRepair"));
			}
			
			if (!oMD115Shared.DetectMethod) {
				this._addCIDFieldError("/md115/DetectMethod");
			} else if (oMD115Shared.DetectMethod === "D" && !oMD115Shared.DetectMethod) {
				this._addCIDFieldError("/md115/EquipDerailNo");
			}
			
			// TODO: Lookup from RJC/WMC C208/C209
			if (!oMD115Shared.JournalSize) {
				this._addCIDFieldError("/md115/JournalSize");
			}
			
			// TODO: Lookup from RJC/WMC C113
			if (!oMD115Shared.WheelDiameter) {
				this._addCIDFieldError("/md115/WheelDiameter");
			}
			
			if (!oMD115Shared.BrakeShoeStd) {
				this._addCIDFieldError("/md115/BrakeShoeStd");
			}
			
			// TODO: Lookup from RJC/WMC C115
			if (!oMD115Shared.PlateType) {
				this._addCIDFieldError("/md115/PlateType");
			}
			
			// TODO: Lookup from RJC/WMC C118
			if (!oMD115Shared.WheelType) {
				this._addCIDFieldError("/md115/WheelType");
			}
			
			if (!oMD115.FrontDiscoloration) {
				this._addCIDFieldError("/md115" + sWheelSide + "/FrontDiscoloration");
			}
			
			if (!oMD115.BackDiscoloration) {
				this._addCIDFieldError("/md115" + sWheelSide + "/BackDiscoloration");
			}
			
			if (!oMD115.MountDateMm || parseInt(oMD115.MountDateMm, 10) < 1 || parseInt(oMD115.MountDateMm, 10) > 12) {
				this._addCIDFieldError("/md115" + sWheelSide + "/MountDateMm");
			}
			
			if (!oMD115.MountDateYy) {
				this._addCIDFieldError("/md115" + sWheelSide + "/MountDateYy");
			}
			
			if (!oMD115.WheelShopMark) {
				this._addCIDFieldError("/md115" + sWheelSide + "/WheelShopMark");
			}
			
			if (!oMD115.LockMountShopMark) {
				this._addCIDFieldError("/md115" + sWheelSide + "/LockMountShopMark");
			}
			
			if (!oMD115.NewReconditioned) {
				this._addCIDFieldError("/md115" + sWheelSide + "/NewReconditioned");
			} else if (oMD115.NewReconditioned === "R" && !oMD115.RecondShopMark) {
				this._addCIDFieldError("/md115" + sWheelSide + "/RecondShopMark");
			}
			
			if (!oMD115.LockManufacMm || parseInt(oMD115.LockManufacMm, 10) < 1 || parseInt(oMD115.LockManufacMm, 10) > 12) {
				this._addCIDFieldError("/md115" + sWheelSide + "/LockManufacMm");
			}
			
			if (!oMD115.LockManufacYy) {
				this._addCIDFieldError("/md115" + sWheelSide + "/LockManufacYy");
			}
			
			// TODO: Lookup from RJC/WMC C114
			if (!oMD115.DefWheelDesig) {
				this._addCIDFieldError("/md115" + sWheelSide + "/DefWheelDesig");
			}
			
			// TODO: Lookup from RJC/WMC C114
			if (!oMD115Other.DefWheelDesig) {
				this._addCIDFieldError("/md115" + sOtherSide + "/DefWheelDesig");
			}
			
			// TODO: Lookup from RJC/WMC C111
			if (!oMD115.DefWheelSnNo) {
				this._addCIDFieldError("/md115" + sWheelSide + "/DefWheelSnNo");
			}
			
			// TODO: Lookup from RJC/WMC C111
			if (!oMD115Other.DefWheelSnNo) {
				this._addCIDFieldError("/md115" + sOtherSide + "/DefWheelSnNo");
			}
			
			if (!oMD115.BrakeShoeFailedWheel) {
				this._addCIDFieldError("/md115" + sWheelSide + "/BrakeShoeFailedWheel");
			}
			
			if (!oMD115.DefectLocation) {
				this._addCIDFieldError("/md115" + sWheelSide + "/DefectLocation");
			}
			
			if (!oMD115.NumCrackInches) {
				this._addCIDFieldError("/md115" + sWheelSide + "/NumCrackInches");
			}
		},
		
		_submitMD11Report: function (sSide) {
			var oModel = this.getView().getModel();
			var oAddCIDViewModel = this.getModel("addCIDView");
			var oHeader = oAddCIDViewModel.getProperty("/cidHeader");
			var oMD11 = oAddCIDViewModel.getProperty("/md11" + sSide);
			var oMD11Shared = oAddCIDViewModel.getProperty("/md11");
			
			// Sequence of MD-11/115 reports: 11L, 11R, 115L, 115R
			if (sSide === "Left" && (!oAddCIDViewModel.getProperty("/md11RequiredLeft") || oAddCIDViewModel.getProperty("/md11SuccessLeft"))) {
				this._submitMD11Report("Right");
				return;
			} else if (sSide === "Right" && (!oAddCIDViewModel.getProperty("/md11RequiredRight") || oAddCIDViewModel.getProperty("/md11SuccessRight"))) {
				//this._submitMD115Report("Left");
				return;
			}
			
			oMD11.EquipmentSide = (sSide === "Left") ? "L" : "R";
			oMD11.ComponentLocation = oHeader.location;
			oMD11.RepairDate = oHeader.repairDate;
			oMD11.WhyMadeCode = oAddCIDViewModel.getProperty("/response/BrWhyMadeCode" + sSide);
		
			// Add properties from addCIDView>/md11
			oMD11.FailureDate = oMD11Shared.FailureDate || null;
			oMD11.Derailment = oMD11Shared.Derailment;
			oMD11.BearingSize = oMD11Shared.BearingSize;
			oMD11.DetectMethod = oMD11Shared.DetectMethod || "";
			oMD11.DetectionDesc = oMD11Shared.DetectionDesc || "";
			
			// convert Wheel SN to string
			oMD11.WheelSnFailedSide = oMD11.WheelSnFailedSide + "";
			
			var sCarMark = oHeader.carMark;
			var aSplitCarMark = sCarMark.match(/^([A-Za-z]+)([0-9]+)$/);
			oMD11.EquipmentInitial = aSplitCarMark[1];
			oMD11.EquipmentNumber = aSplitCarMark[2];
			
			oModel.create("/BearingDefectRptSet", oMD11, {
				method: "POST",
				success: function (oData, resp) {
					this.getModel("addCIDView").setProperty("/busy", false);
					
					var sMessage;
					var sMessageLength = oData.to_Message.results.length;
				
					// fetch report result
					if (sMessageLength === 0 || oData.to_Message.results[0].ResponseType === "S") {
						oAddCIDViewModel.setProperty("/md11Success" + sSide, true);
						
						if (sSide === "Left") {
							this._submitMD11Report("Right");
						} else if (sSide === "Right") {
							// TODO: Submit MD-115 reports (if they exist)
							// this._submitMD115Report("Left");
						}
						
						sMessage = this.getView().getModel("i18n").getResourceBundle().getText("message.MD11ReportCreated");

						//show a message toast if the registration is successful
						MessageToast.show(sMessage, {
							duration: 1500,
							onClose: function () {
								this.onNavBack();
							}.bind(this)
						});
					} else {
						//fetch error message and register to message manager
						for (var i = 0; i < oData.to_Message.results.length; i++) {
							sap.ui.getCore().getMessageManager().addMessages(new sap.ui.core.message.Message({
								message: oData.to_Message.results[i].ResponseMessage,
								persistent: true,
								type: sap.ui.core.MessageType.Error
							}));
						}
					}
				}.bind(this),
				//fetch error message and register to message manager
				error: function (oError) {
					this.getModel("addCIDView").setProperty("/busy", false);
					var oMessage = sap.ui.getCore().getMessageManager().getMessageModel().getData();
					var sMsg = oMessage && oMessage[1] && oMessage[1].message;
					MessageBox.error(sMsg);
				}.bind(this)
			});
		},
		
		_loadRJCRulesMap: function () {
			var mRJCRules = {};
			var oRJCItem;
			var sJobCode;
			this.getModel().read("/ZMPM_CDS_CAR_APPLIEDJOBCODE", {
				filters: [new sap.ui.model.Filter("RuleNumber", sap.ui.model.FilterOperator.NE, "")],
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oRJCItem = oData.results[i];
						sJobCode = oRJCItem.JobCode;
						mRJCRules[sJobCode] = oRJCItem.RuleNumber;
					}
					this.getModel("addCIDView").setProperty("/RJCRuleMap", mRJCRules);
				}.bind(this),
				error: function (sMsg) {
				}.bind(this)
			});
		},
		
		_loadRJCWhyMadeMap: function () {
			var mRJCWhyMade = {};
			var oMDItem;
			this.getModel().read("/ZMPM_CDS_CAR_MD_REPORT", {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oMDItem = oData.results[i];
						if (oMDItem.md_report === "MD-11" || oMDItem.md_report === "MD-115") {
							var sRule = "R" + oMDItem.rulenumber;
							var sWhyMade = "W" + oMDItem.whymade;
							var sIndex = sRule + sWhyMade;
							mRJCWhyMade[sIndex] = oMDItem.md_report;
						}
					}
					this.getModel("addCIDView").setProperty("/RJCRuleWhyMadeMap", mRJCWhyMade);
				}.bind(this),
				error: function (sMsg) {
				}.bind(this)
			});
		}
	});
});