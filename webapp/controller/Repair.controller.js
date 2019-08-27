sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox, Filter, FilterOperator) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.Repair", {
		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the controller is instantiated.
		 * @public
		 */
		onInit: function () {
			this.setModel(this._createViewModel(), "RepairsModel");
			this.getModel("RepairsModel").setSizeLimit(10000000);
			this._initScreenValues();
			this._loadComboBoxValues();
			sap.ui.getCore().getEventBus().subscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);
			sap.ui.getCore().getEventBus().subscribe("onLoadRemovedJobCodeLeft", this._getRemovedJobCodeLeft, this);

		},

		onExit: function () {
			sap.ui.getCore().getEventBus().unsubscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);
			sap.ui.getCore().getEventBus().unsubscribe("onLoadRemovedJobCodeLeft", this._getRemovedJobCodeLeft, this);

		},

		/**
		 * to handle change of Applied Job Code
		 * @public
		 * @param {String} sInputId - Input Field ID
		 */
		onChangeAppliedJobCode: function (sInputId) {
			var sPath;
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
			var appliedJobCodeLeft = this.getView().byId("idRepairAJCLeft").getSelectedKey();
			var oJobCode = {};

			// Determine Removed Job Code
			switch (sInputId) {
				// Right Wheel
			case "idRepairAJC":
				if (appliedJobCode && appliedJobCode !== "0000") {
					this.byId("idRepairRJC").setSelectedKey("");
					this.byId("idRepairRJC").setValue("");
					//Get property of the applied job code
					sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: appliedJobCode,
						PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
					});

					oJobCode = this.getModel().getProperty(sPath);

					//Check Applied Qualifier Rule
					this.getView().byId("idRepairAQ").setSelectedKey("");
					if (oJobCode && oJobCode !== undefined) {
						this._determineAppliedQualifier(appliedJobCode, oJobCode);
					}
					//Check Condition Code
					this._determineConditionCode("idRepairAJC");
					//Check Why Made Code
					this._determineWhyMadeCode();
					// Check Removed Job Code
					this._getRemovedJobCode();
					//Get rule from AJC and compare to Why Made to determine if MD-115 report/fields required
					this._setMD115FromAJCAndWhyMade("Right");
				}
				break;
				// Left Wheel
			case "idRepairAJCLeft":

				if (appliedJobCodeLeft && appliedJobCodeLeft !== "0000") {
					this.byId("idRepairRJCLeft").setSelectedKey("");
					this.byId("idRepairRJCLeft").setValue("");
					//Get property of the applied job code
					sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: appliedJobCodeLeft,
						PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
					});

					oJobCode = this.getModel().getProperty(sPath);
					//Check Applied Qualifier Rule
					this.getView().byId("idRepairAQLeft").setSelectedKey("");
					if (oJobCode && oJobCode !== undefined) {
						this._determineAppliedQualifierLeft(appliedJobCodeLeft, oJobCode);
					}
					//Check Condition Code
					this._determineConditionCode("idRepairAJCLeft");
					//Check Why Made Code
					this._determineWhyMadeCodeLeft();
					// Check Removed Job Code
					this._getRemovedJobCodeLeft();
					//Get rule from AJC and compare to Why Made to determine if MD-115 report/fields required
					this._setMD115FromAJCAndWhyMade("Left");
				}
				break;
			}
		},

		/**
		 * to handle value help for combo box
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from value help
		 */
		onValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getSelectedKey();
			var sTitle, sPath;

			this._sInputId = oEvent.getSource().getId();

			switch (this.getElementRealID(this._sInputId)) {
			case "idRepairAJC":
				sTitle = this.getResourceBundle().getText("appliedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/AppliedJobCode";
				break;
			case "idRepairRJC":
				if (sInputValue === "0000" || sInputValue === "") {
					this._getRemovedJobCode();
				}
				sTitle = this.getResourceBundle().getText("removedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/RemovedJobCode";
				break;
			case "idRepairAJCLeft":
				sTitle = this.getResourceBundle().getText("appliedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/AppliedJobCodeLeft";
				break;
			case "idRepairRJCLeft":
				if (sInputValue === "0000" || sInputValue === "") {
					this._getRemovedJobCodeLeft();
				}
				sTitle = this.getResourceBundle().getText("removedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/RemovedJobCodeLeft";
				break;
			}

			if (!this._oValueHelpDialog) {
				this._oValueHelpDialog = new sap.m.SelectDialog({
					confirm: [this.onValueHelpConfirm, this],
					cancel: [this.onValueHelpCancel, this],
					search: [this.onValueHelpSearch, this]
				});

				this.getView().addDependent(this._oValueHelpDialog);

				this._oTemplate = new sap.m.StandardListItem({
					title: "{RepairsModel>key}",
					description: "{RepairsModel>text}"
				});
			}

			this._oValueHelpDialog.setTitle(sTitle);
			this._oValueHelpDialog.setContentWidth("40%");
			this._oValueHelpDialog.bindAggregation("items", sPath, this._oTemplate);

			// create a filter for the binding
			this._oValueHelpDialog.getBinding("items").filter(new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter("key", sap.ui.model.FilterOperator.Contains, sInputValue),
					new sap.ui.model.Filter("text", sap.ui.model.FilterOperator.Contains, sInputValue)
				],
				and: false
			}));

			this._oValueHelpDialog.open(sInputValue);
		},

		/**
		 * to handle search function in value help
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from value help search field
		 */
		onValueHelpSearch: function (oEvent) {
			var sValue = oEvent.getParameter("value");
			oEvent.getSource().getBinding("items").filter(new sap.ui.model.Filter({
				filters: [
					new sap.ui.model.Filter("key", sap.ui.model.FilterOperator.Contains, sValue),
					new sap.ui.model.Filter("text", sap.ui.model.FilterOperator.Contains, sValue)
				],
				and: false
			}));
		},

		/**
		 * to handle selected item in value help
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from value help for selected item
		 */
		onValueHelpConfirm: function (oEvent) {
			var oSelectedItem = oEvent.getParameter("selectedItem");

			if (oSelectedItem) {
				this.byId(this._sInputId).setSelectedKey(oSelectedItem.getTitle());
			}
			oEvent.getSource().getBinding("items").filter([]);

			switch (this.getElementRealID(this._sInputId)) {
			case "idRepairAJC":
			case "idRepairAJCLeft":
				this.onChangeAppliedJobCode(this.getElementRealID(this._sInputId));
				break;
			case "idRepairRJC":
			case "idRepairRJCLeft":
				this.handleChangeRemovedJobCodeAJC(this.getElementRealID(this._sInputId));
				break;

			}
			this._oValueHelpDialog = undefined;
			this._sInputId = undefined;
		},

		/**
		 * to handle cancel action in value help
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from value help cancel action
		 */
		onValueHelpCancel: function (oEvent) {
			this._oValueHelpDialog = undefined;
			this._sInputId = undefined;
		},

		/**
		 * to provide possible drop down list entries for value help
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from value help search field
		 */
		onSuggestionItemSelected: function (oEvent) {
			var sInputId = this.getElementRealID(oEvent.getSource().getId());

			switch (sInputId) {
			case "idRepairAJC":
			case "idRepairAJCLeft":
				this.onChangeAppliedJobCode(sInputId);
				break;
			case "idRepairRJC":
			case "idRepairRJCLeft":
				this.handleChangeRemovedJobCodeAJC(sInputId);
				break;
			}
		},

		/**
		 * to handle change of Removed Job Code event
		 * @public
		 * @param {String} sInputId - Input field ID
		 */
		handleChangeRemovedJobCodeAJC: function (sInputId) {
			var sPath, oJobCode;
			var oContext = this.getModel("addCIDView").getProperty("/response");

			switch (sInputId) {
			case "idRepairRJC":
				var removedJobCode = oContext.WrRemovedJobCodeRight;

				if (removedJobCode && removedJobCode !== "0000") {
					//Get property of the removed job code
					sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: removedJobCode,
						PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
					});
					oJobCode = this.getModel().getProperty(sPath);
					if (oJobCode) {
						this._determineRemovedQualifier(removedJobCode, oJobCode, "idRepairRJC");
					} else {
						this.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifier", []);
					}
					// this._getRemovedQualifier(removedJobCode, "idRepairRemovedQualifier");
				}
				this._determineWhyMadeCode();
				break;

			case "idRepairRJCLeft":
				var removedJobCodeLeft = oContext.WrRemovedJobCodeLeft;
				if (removedJobCodeLeft && removedJobCodeLeft !== "0000") {
					//Get property of the removed job code
					sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: removedJobCodeLeft,
						PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
					});
					oJobCode = this.getModel().getProperty(sPath);
					if (oJobCode) {
						this._determineRemovedQualifier(removedJobCodeLeft, oJobCode, "idRepairRJCLeft");
					} else {
						this.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifierLeft", []);
					}
				}
				this._determineWhyMadeCodeLeft();
				break;
			}
		},
		
		onChangeWhyMadeCode: function (oEvent) {
			var sInputId = this.getElementRealID(oEvent.getSource().getId());
			
			// Left: idRepairWhyMadeCodeLeft, Right: idRepairWhyMadeCode
			// look up AJC for matching side
			if (sInputId === "idRepairWhyMadeCodeLeft") {
				this._setMD115FromAJCAndWhyMade("Left");
			} else if (sInputId === "idRepairWhyMadeCodeLeft") {
				this._setMD115FromAJCAndWhyMade("Right");
			}
		},

		/**
		 * to handle change of Removed Job Code event
		 * @public
		 * @param {string} sSourceID - UI element ID
		 * @return {string} sSourceID - view element ID
		 */
		getElementRealID: function (sSourceID) {
			return sSourceID.split("--")[1];
		},

		/**
		 * to handle on change of Condition Code event
		 * @public
		 * @param {sap.ui.base.Event} oEvent - Event object from Condition Code 
		 */
		onChangeConditionCode: function (oEvent) {
			var sInputId = this.getElementRealID(oEvent.getSource().getId());

			//Check Why Made Code
			switch (sInputId) {
			case "idRepairCondCode":
				this._determineWhyMadeCode();
				break;
			case "idRepairCondCodeLeft":
				this._determineWhyMadeCodeLeft();
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
					AppliedQualifierUnfiltered: [],
					ConditionCode: [],
					RemovedJobCode: [],
					RemovedQualifier: [],
					WhyMadeCode: [],
					Location: [],
					AppliedJobCodeLeft: [],
					AppliedQualifierLeft: [],
					AppliedQualifierUnfilteredLeft: [],
					ConditionCodeLeft: [],
					RemovedJobCodeLeft: [],
					RemovedQualifierLeft: [],
					WhyMadeCodeLeft: [],
					MD115DetectMethod: [],
					MD115JournalBearingSize: [],
					MD115BrakeShoe: [],
					MD115WheelDesignation: [],
					MD115WheelDiameter: [],
					MD115BodyMountedBrakes: [],
					MD115BrakeMisalignment: []
				},
				MD115DetectMethodBusy: true,
				MD115JournalBearingSizeBusy: true,
				MD115WheelDesignationBusy: true,
				MD115BrakeShoeBusy: true
			});
		},

		/**
		 * to get screen values during initial load
		 * @private
		 */
		_initScreenValues: function () {
			this._getAppliedJobCode();
			this._getAppliedJobCodeLeft();
		},
		
		_loadComboBoxValues: function () {
			this._loadMethodOfDetection();
			this._loadJournalBearingSize();
			this._loadWheelDiameterAndDesign();
			this._loadBrakeShoe();
			this._loadBodyMountedBrakes();
			this._loadBrakeMisalignment();
		},
		
		_loadMethodOfDetection: function () {
			var aComboBoxItems = [];
			var oComboBoxItem;
			this.getModel().read("/ZMPM_CDS_CAR_MTHD_DETECT", {
				filters: [new Filter("md_report", FilterOperator.EQ, "MD-115")],
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].detect_method;
						oComboBoxItem.text = oData.results[i].detect_desc;
						aComboBoxItems.push(oComboBoxItem);
					}
					this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115DetectMethod", aComboBoxItems);
					this.getModel("RepairsModel").setProperty("/MD115DetectMethodBusy", false);
				}.bind(this),
				error: function (sMsg) {
					this.getModel("RepairsModel").setProperty("/MD115DetectMethodBusy", false);
				}.bind(this)
			});
		},
		
		_loadJournalBearingSize: function () {
			var aComboBoxItems = [];
			var oComboBoxItem;
			this.getModel().read("/ZMPM_CDS_CAR_JRM_BRG_SIZE", {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].bearing_size;
						oComboBoxItem.text = oData.results[i].bearing_desc;
						aComboBoxItems.push(oComboBoxItem);
					}
					this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115JournalBearingSize", aComboBoxItems);
					this.getModel("RepairsModel").setProperty("/MD115JournalBearingSizeBusy", false);
				}.bind(this),
				error: function (sMsg) {
					this.getModel("RepairsModel").setProperty("/MD115JournalBearingSizeBusy", false);
				}.bind(this)
			});
		},
		
		_loadWheelDiameterAndDesign: function () {
			var aComboBoxItems = [];
			var oComboBoxItem;
			var sWheelDiameter;
			var mWheelDiameters = {};
			this.getModel().read("/ZMPM_CDS_CAR_WHEEL_DESIG", {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						sWheelDiameter = oData.results[i].wheel_nom_dia + "";
						if (oData.results[i].valid) {
							mWheelDiameters[sWheelDiameter] = {diameter: sWheelDiameter};
						}

						oComboBoxItem = {};
						oComboBoxItem.design = oData.results[i].wheel_desig;
						oComboBoxItem.diameter = sWheelDiameter;
						oComboBoxItem.valid = oData.results[i].valid;
						aComboBoxItems.push(oComboBoxItem);
					}
					this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115WheelDesignation", aComboBoxItems);
					this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115WheelDiameter", Object.values(mWheelDiameters));
					this.getModel("RepairsModel").setProperty("/MD115WheelDesignationBusy", false);
				}.bind(this),
				error: function (sMsg) {
					this.getModel("RepairsModel").setProperty("/MD115WheelDesignationBusy", false);
				}.bind(this)
			});
		},
		
		_loadBrakeShoe: function () {
			var aComboBoxItems = [];
			var oComboBoxItem;
			this.getModel().read("/ZMPM_CDS_CAR_BRAKE_SHOE_TYPE", {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].brakeshoe_type;
						oComboBoxItem.text = oData.results[i].brakeshoe_type_desc;
						aComboBoxItems.push(oComboBoxItem);
					}
					this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115BrakeShoe", aComboBoxItems);
					this.getModel("RepairsModel").setProperty("/MD115BrakeShoeBusy", false);
				}.bind(this),
				error: function (sMsg) {
					this.getModel("RepairsModel").setProperty("/MD115BrakeShoeBusy", false);
				}.bind(this)
			});
		},
		
		_loadBodyMountedBrakes: function () {
			var aComboBoxItems = [	{key: "Y", text: "Yes"},
									{key: "N", text: "No"}	];
									
			this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115BodyMountedBrakes", aComboBoxItems);
		},
		
		_loadBrakeMisalignment: function () {
			var aComboBoxItems = [	{key: "Y", text: "Yes"},
									{key: "N", text: "No"}	];
									
			this.getModel("RepairsModel").setProperty("/comboBoxValues/MD115BrakeMisalignment", aComboBoxItems);
		},

		/** 
		 * Method to get Applied Job Code
		 * @private
		 * @returns {Promise} - Promise objects with the items retrieved
		 */
		_getAppliedJobCode: function () {
			return new Promise(function (resolve) {
				this._getJobCode([], "/comboBoxValues/AppliedJobCode").then(function (aItems) {
					resolve(aItems);
				}.bind(this));
				this.onChangeAppliedJobCode("idRepairAJC");
			}.bind(this));
		},

		/** 
		 * Method to get Applied Job Code
		 * @private
		 * @returns {Promise} - Promise objects with the items retrieved
		 */
		_getAppliedJobCodeLeft: function () {
			return new Promise(function (resolve) {
				this._getJobCodeLeft([], "/comboBoxValues/AppliedJobCodeLeft").then(function (aItems) {
					resolve(aItems);
				}.bind(this));
				this.onChangeAppliedJobCode("idRepairAJCLeft");
			}.bind(this));
		},

		/** 
		 * Method to get Job Code - Right Wheel
		 * @constructor 
		 * @param {Object} aFilter - The filter criteia
		 * @param {String} sProperty - The property to be binded in the model
		 * @returns {Promise} - Array of items retrieved/Error
		 */
		_getJobCode: function (aFilter, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_REPAIR_JOBCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					urlParameters: {
						"$orderby": "JobCode"
					},
					filters: aFilter,
					success: function (oData) {
						var sAppliedRemovedIndicator = (sProperty === "/comboBoxValues/AppliedJobCode" ? "B" : "N");

						//Function to add items
						function addItem(oItem) {
							oComboBoxItem = {};
							oComboBoxItem.key = oItem.JobCode;
							oComboBoxItem.text = oItem.JobCodeDescription;
							aComboBoxItem.push(oComboBoxItem);
						}

						for (var i = 0; i < oData.results.length; i++) {
							if (oData.results[i].EffectiveDate === null && oData.results[i].ExpirationDate === null && oData.results[i].PriceMasterID ===
								"00000000000000000000000000000000000000") {
								addItem(oData.results[i]);
							} else {
								if (sProperty === "/comboBoxValues/AppliedJobCode" && oData.results[i].AppliedRemovedIndicator ===
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === this.getModel("addCIDView").getProperty(
										"/cidHeader/priceMasterId")) {
									addItem(oData.results[i]);
								} else if (sProperty === "/comboBoxValues/RemovedJobCode" && oData.results[i].AppliedRemovedIndicator !==
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === this.getModel("addCIDView").getProperty(
										"/cidHeader/priceMasterId")) {
									addItem(oData.results[i]);
								}
							}
						}
						this._aAppliedJobCode = aComboBoxItem;
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {
						resolve("Error");
					}
				});
			}.bind(this));
		},

		/** 
		 * Method to get Job Code - Left Wheel
		 * @constructor 
		 * @param {Object} aFilter - The filter criteia
		 * @param {String} sProperty - The property to be binded in the model
		 * @returns {Promise} - Array of items retrieved/Error
		 */
		_getJobCodeLeft: function (aFilter, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_REPAIR_JOBCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					urlParameters: {
						"$orderby": "JobCode"
					},
					filters: aFilter,
					success: function (oData) {
						var sAppliedRemovedIndicator = (sProperty === "/comboBoxValues/AppliedJobCodeLeft" ? "B" : "N");

						//Function to add items
						function addItem(oItem) {
							oComboBoxItem = {};
							oComboBoxItem.key = oItem.JobCode;
							oComboBoxItem.text = oItem.JobCodeDescription;
							aComboBoxItem.push(oComboBoxItem);
						}

						for (var i = 0; i < oData.results.length; i++) {
							if (oData.results[i].EffectiveDate === null && oData.results[i].ExpirationDate === null && oData.results[i].PriceMasterID ===
								"00000000000000000000000000000000000000") {
								addItem(oData.results[i]);
							} else {
								if (sProperty === "/comboBoxValues/AppliedJobCodeLeft" && oData.results[i].AppliedRemovedIndicator ===
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === this.getModel("addCIDView").getProperty(
										"/cidHeader/priceMasterId")) {
									addItem(oData.results[i]);
								} else if (sProperty === "/comboBoxValues/RemovedJobCodeLeft" && oData.results[i].AppliedRemovedIndicator !==
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === this.getModel("addCIDView").getProperty(
										"/cidHeader/priceMasterId")) {
									addItem(oData.results[i]);
								}
							}
						}
						this._aAppliedJobCode = aComboBoxItem;
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {
						resolve("Error");
					}
				});
			}.bind(this));
		},

		/**
		 * to get Condition Code value 
		 * @private
		 */
		_determineConditionCode: function (sInput) {
			var aFilter;
			var appliedJobCode;

			switch (sInput) {
			case "idRepairAJC":
				appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

				if (this._compareRule(appliedJobCode, "NEW", "99")) {
					aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: appliedJobCode,
						and: true
					})];

					this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter, "idRepairCondCode");
				} else {
					this._getConditionCode("/ZMPM_CDS_CAR_CONDITIONCODE", "/comboBoxValues/ConditionCode", [], "idRepairCondCode");
				}
				break;
			case "idRepairAJCLeft":
				appliedJobCode = this.getView().byId("idRepairAJCLeft").getSelectedKey();

				if (this._compareRule(appliedJobCode, "NEW", "99")) {
					aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: appliedJobCode,
						and: true
					})];

					this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCodeLeft", aFilter, "idRepairCondCodeLeft");
				} else {
					this._getConditionCode("/ZMPM_CDS_CAR_CONDITIONCODE", "/comboBoxValues/ConditionCodeLeft", [], "idRepairCondCodeLeft");
				}
				break;
			}
		},

		/** 
		 * Method to get Condition Code
		 * @constructor 
		 * @param {String} sPath - The path(CDS) to be read
		 * @param {String} sProperty - The property to be binded in the model
		 * @param {Array} aFilter - The array of filter criterias
		 */
		_getConditionCode: function (sPath, sProperty, aFilter, sInput) {
			var aComboBoxItem = [];
			var oComboBoxItem;

			this.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].ConditionCode;
						oComboBoxItem.text = oData.results[i].ConditionCodeDescription;
						aComboBoxItem.push(oComboBoxItem);
					}
					this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
					if (aComboBoxItem.length === 1) {
						this.getView().byId(sInput).setSelectedKey(aComboBoxItem[0].key);
					}
				}.bind(this)
			});
		},

		/**
		 * to get Why Made Code value for Right Wheel
		 * @private
		 */
		_determineWhyMadeCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var responsibilityCode = this.getModel("addCIDView").getProperty("/cidHeader/responsibility");
			var aFilter;

			//All must filled
			if (oContext.WrAppliedJobCodeRight === undefined || oContext.WrRemovedJobCodeRight === undefined || responsibilityCode ===
				undefined || oContext.WrAppliedJobCodeRight === "" || oContext.WrRemovedJobCodeRight === "" || responsibilityCode === "") {
				return;
			}

			// //Get Applied Job Code context
			if (this._compareRule(oContext.WrAppliedJobCodeRight, "NEW", "99")) {
				aFilter = [new Filter({
						path: "AppliedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrAppliedJobCodeRight,
						and: true
					}),
					new Filter({
						path: "RemovedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrRemovedJobCodeRight,
						and: true
					}),
					new Filter({
						path: "ResponsibilityCode",
						operator: FilterOperator.EQ,
						value1: responsibilityCode,
						and: true
					}),
					new Filter({
						path: "PriceMasterID",
						operator: FilterOperator.EQ,
						value1: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId"),
						and: true
					})
				];
			} else {
				aFilter = [];
			}

			this._getJobCodePrice(aFilter, "/comboBoxValues/WhyMadeCode", true, null).then(function (aItems) {
				if (aItems.length === 1) {
					this.getView().byId("idRepairWhyMadeCode").setSelectedKey(aItems[0].key);
				}
			}.bind(this));
		},

		/**
		 * to get Why Made Code value for Left Wheel
		 * @private
		 */
		_determineWhyMadeCodeLeft: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var responsibilityCode = this.getModel("addCIDView").getProperty("/cidHeader/responsibility");
			var aFilter;
		

			//All must filled
			if (oContext.WrAppliedJobCodeLeft === undefined || oContext.WrRemovedJobCodeLeft === undefined || responsibilityCode === undefined ||
				oContext.WrAppliedJobCodeLeft === "" || oContext.WrRemovedJobCodeLeft === "" || responsibilityCode === "") {
				return;
			}

			//Get Applied Job Code context
			if (this._compareRule(oContext.WrAppliedJobCodeLeft, "NEW", "99")) {
				aFilter = [new Filter({
						path: "AppliedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrAppliedJobCodeLeft,
						and: true
					}),
					new Filter({
						path: "RemovedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrRemovedJobCodeLeft,
						and: true
					}),
					new Filter({
						path: "ResponsibilityCode",
						operator: FilterOperator.EQ,
						value1: responsibilityCode,
						and: true
					}),
					new Filter({
						path: "PriceMasterID",
						operator: FilterOperator.EQ,
						value1: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId"),
						and: true
					})
				];
			} else {
				aFilter = [];
			}

			this._getJobCodePrice(aFilter, "/comboBoxValues/WhyMadeCodeLeft", true, null).then(function (aItems) {
				if (aItems.length === 1) {
					this.getView().byId("idRepairWhyMadeCodeLeft").setSelectedKey(aItems[0].key);
				}
			}.bind(this));

		},

		/**
		 * to get Removed Job Code value for Right Wheel
		 * @private
		 */
		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var oContext = this.getModel("addCIDView").getProperty("/response");

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJobCodeRight,
				PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			//Check AJC whether it is end with 99
			if (this._compareRule(oContext.WrAppliedJobCodeRight, "NEW", "99")) {
				aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrAppliedJobCodeRight,
						and: true
					}),
					new Filter({
						path: "PriceMasterID",
						operator: FilterOperator.EQ,
						value1: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId"),
						and: true
					})
				];

				this._getJobCodeCouplet(aFilter, "/comboBoxValues/RemovedJobCode", false).then(function (aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.getView().byId("idRepairRJC").setSelectedKey(aItems[0]);
					}
					this._determineConditionCode("idRepairAJC");
					if (oAppliedJobCode && oAppliedJobCode !== undefined) {
						this._determineAppliedQualifier(oContext.WrAppliedJobCodeRight, oAppliedJobCode);
					}
					this.handleChangeRemovedJobCodeAJC("idRepairRJC");
					this._determineWhyMadeCode();
					// this.getModel("addCIDView").updateBindings(true);
				}.bind(this));
			} else {
				this._getJobCode([], "/comboBoxValues/RemovedJobCode").then(function (sStatus, aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.byId("idRepairRJC").setSelectedKey(aItems[0].key);
					}
					this._determineConditionCode("idRepairAJC");
					if (oAppliedJobCode && oAppliedJobCode !== undefined) {
						this._determineAppliedQualifier(oContext.WrAppliedJobCodeRight, oAppliedJobCode);
					}
					this._determineWhyMadeCode();
					this.handleChangeRemovedJobCodeAJC("idRepairRJC");
					// this.getModel("addCIDView").updateBindings(true);
				}.bind(this));
			}

		},

		/**
		 * to get Removed Job Code value for Left Wheel
		 * @private
		 */
		_getRemovedJobCodeLeft: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var oContext = this.getModel("addCIDView").getProperty("/response");

			// Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJobCodeLeft,
				PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			//Check AJC whether it is end with 99
			if (this._compareRule(oContext.WrAppliedJobCodeLeft, "NEW", "99")) {
				aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WrAppliedJobCodeLeft,
						and: true
					}),
					new Filter({
						path: "PriceMasterID",
						operator: FilterOperator.EQ,
						value1: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId"),
						and: true
					})
				];

				this._getJobCodeCouplet(aFilter, "/comboBoxValues/RemovedJobCodeLeft", false).then(function (aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.getView().byId("idRepairRJCLeft").setSelectedKey(aItems[0]);
					}
					this._determineConditionCode("idRepairAJCLeft");
					this._determineWhyMadeCode();
					if (oAppliedJobCode && oAppliedJobCode !== undefined) {
						this._determineAppliedQualifierLeft(oContext.WrAppliedJobCodeLeft, oAppliedJobCode);
					}
					this.handleChangeRemovedJobCodeAJC("idRepairRJCLeft");

				}.bind(this));
			} else {
				this._getJobCode([], "/comboBoxValues/RemovedJobCodeLeft").then(function (sStatus, aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.byId("idRepairRJCLeft").setSelectedKey(aItems[0].key);
					}
					this._determineConditionCode("idRepairAJCLeft");
					if (oAppliedJobCode && oAppliedJobCode !== undefined) {
						this._determineAppliedQualifierLeft(oContext.WrAppliedJobCodeLeft, oAppliedJobCode);
					}
					this.handleChangeRemovedJobCodeAJC("idRepairRJCLeft");
					this._determineWhyMadeCode();

				}.bind(this));
			}

		},

		/** 
		 * Method to get Job Code from Couplet 
		 * @constructor 
		 * @param {Array} aFilter - Array of filter criterias
		 * @param {String} sProperty - Property to be binded in the model
		 * @param {Boolean} bAppliedJobCode - Indicator whether it is for Applied Job Code (true/false)
		 * @returns {Promise} - Values added in the combobox
		 */
		_getJobCodeCouplet: function (aFilter, sProperty, bAppliedJobCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCDCOUPLET";
			var aComboBoxItem = [];
			var oComboBoxItem;
			var aKeyAdded = [];

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					urlParameters: {
						"$orderby": (bAppliedJobCode ? "JobCode" : "RemovedJobCode")
					},
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							if (bAppliedJobCode && aKeyAdded.indexOf(oData.results[i].JobCode) === -1) {
								oComboBoxItem.key = oData.results[i].JobCode;
								oComboBoxItem.text = oData.results[i].JobCodeDescription;
								aComboBoxItem.push(oComboBoxItem);
								aKeyAdded.push(oData.results[i].JobCode);
							} else if (!bAppliedJobCode && aKeyAdded.indexOf(oData.results[i].RemovedJobCode) === -1) {
								oComboBoxItem.key = oData.results[i].RemovedJobCode;
								oComboBoxItem.text = oData.results[i].RemovedJobCodeDescription;
								aComboBoxItem.push(oComboBoxItem);
								aKeyAdded.push(oData.results[i].RemovedJobCode);
							}
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aKeyAdded);
					}.bind(this)
				});
			}.bind(this));

		},

		/**
		 * to get Job Code Price data
		 * @private
		 * @param {Array} aFilter - array that contains filter condition to query CDS
		 * @param {String} sProperty - combo box name
		 * @param {Boolean} bWhyMadeCode - Boolean for Why Made Code
		 * @param {Boolean} bConditionCode - Boolean for Condition Code
		 * @return {object} Promise - return Job Code Price context
		 */
		_getJobCodePrice: function (aFilter, sProperty, bWhyMadeCode, bConditionCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODEPRICE";
			var aComboBoxItem = [];
			var aWhyMadeCodeAdded = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
							for (var i = 0; i < oData.results.length; i++) {
								oComboBoxItem = {};

								if (bWhyMadeCode) {
									if (aWhyMadeCodeAdded.indexOf(oData.results[i].WhyMadeCode) !== -1) {
										continue;
									}
									oComboBoxItem.key = oData.results[i].WhyMadeCode;
									oComboBoxItem.text = oData.results[i].WhyMadeCodeDescription;
									aComboBoxItem.push(oComboBoxItem);
									aWhyMadeCodeAdded.push(oData.results[i].WhyMadeCode);
								}

								if (bConditionCode) {
									oComboBoxItem.key = oData.results[i].ConditionCode;
									oComboBoxItem.text = oData.results[i].ConditionCodeDescription;
									aComboBoxItem.push(oComboBoxItem);
								}
							}
							this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
							resolve(aComboBoxItem);
						}.bind(this)
						// error: function (sMsg) {}.bind(this)
				});
			}.bind(this));
		},

		/** 
		 * Method to compare two values based on custom check (Left and Right hand values)
		 * @constructor 
		 * @param {String} sLeft - Left Hand value to be checked 
		 * @param {String} sCheck - Check Comparator (EQ-Equals/NEQ-Not Equals/EW-Ends With/NEW-Not Ends With/SW-Starts With/NSW-Not Starts With)
		 * @param {String} sRight - Right Hand value to be checked
		 * @returns {Boolean} - Indicator whether the value of right and check compared pattern is matched(true/false)
		 */
		_compareRule: function (sLeft, sCheck, sRight) {
			var bMatch = false;

			switch (sCheck) {
			case "EQ":
				return sLeft === sRight;
			case "NEQ":
				return sLeft !== sRight;
			case "EW":
				if (sLeft.toString().indexOf(sRight.toString(), sLeft.length - sRight.toString().length) !== -1) {
					bMatch = true;
				}
				return bMatch;
			case "NEW":
				if (sLeft.toString().indexOf(sRight.toString(), sLeft.length - sRight.toString().length) === -1) {
					bMatch = true;
				}
				return bMatch;
			case "SW":
				if (sLeft.lastIndexOf(sRight.toString(), 0) === 0) {
					bMatch = true;
				}
				return bMatch;
			case "NSW":
				if (!sLeft.lastIndexOf(sRight.toString(), 0) === 0) {
					bMatch = true;
				}
				return bMatch;
			default:
				return false;
			}
		},

		/** 
		 * Method to determine Applied Qualifier against Rule configured - Right Wheel
		 * @constructor 
		 * @param {String} sAppliedJobCode - Applied Job Code
		 * @param {Object} oJobCode - The Applied Job Code's context
		 */
		_determineAppliedQualifier: function (sAppliedJobCode, oJobCode) {
			//Check against Rule in Applied Qualifier
			var aRule = this.getModel("RepairConfig").getProperty("/AppliedQualifier");
			var aFilter;
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oJobCode.JobCodeOperationTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
					//Check if any Search Table, disable Applied Qualifier if not found
					if (aRule[i].SearchTable) {
						if (this._compareRule(sAppliedJobCode, "NEW", "99")) {
							aFilter = [new Filter({
								path: "JobCode",
								operator: FilterOperator.EQ,
								value1: sAppliedJobCode,
								and: true
							})];
						} else {
							aFilter = [];
						}
						this.getView().byId("idRepairAQ").setEnabled(true);
						if (this.getView().byId("idRepairAQ").getEnabled()) {
							this.getView().byId("idRepairRemovedQualifier").setEnabled(true);
						}

						this._sAppliedQualifierSearchTable = "/" + aRule[i].SearchTable;
						this._getAppliedQualifier(aRule[i].SearchTable, "/comboBoxValues/AppliedQualifier", "/comboBoxValues/AppliedQualifierUnfiltered",
							aFilter, aRule[i].SearchExclusion);
					} else {
						this.getView().byId("idRepairAQ").setEnabled(false);
						if (!this.getView().byId("idRepairAQ").getEnabled()) {
							this.getView().byId("idRepairRemovedQualifier").setEnabled(false);
						}
						this.getView().byId("idRepairAQ").setSelectedKey("");
					}

					break;
				}
			}
		},

		/** 
		 * Method to determine Applied Qualifier against Rule configured - Left Wheel
		 * @constructor 
		 * @param {String} sAppliedJobCode - Applied Job Code
		 * @param {Object} oJobCode - The Applied Job Code's context
		 */
		_determineAppliedQualifierLeft: function (sAppliedJobCode, oJobCode) {
			//Check against Rule in Applied Qualifier
			var aRule = this.getModel("RepairConfig").getProperty("/AppliedQualifier");
			var aFilter;
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oJobCode.JobCodeOperationTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
					//Check if any Search Table, disable Applied Qualifier if not found
					if (aRule[i].SearchTable) {
						if (this._compareRule(sAppliedJobCode, "NEW", "99")) {
							aFilter = [new Filter({
								path: "JobCode",
								operator: FilterOperator.EQ,
								value1: sAppliedJobCode,
								and: true
							})];
						} else {
							aFilter = [];
						}
						this.getView().byId("idRepairAQLeft").setEnabled(true);
						if (this.getView().byId("idRepairAQLeft").getEnabled()) {
							this.getView().byId("idRepairRemovedQualifierLeft").setEnabled(true);
						}

						this._sAppliedQualifierSearchTable = "/" + aRule[i].SearchTable;
						this._getAppliedQualifier(aRule[i].SearchTable, "/comboBoxValues/AppliedQualifierLeft",
							"/comboBoxValues/AppliedQualifierUnfilteredLeft",
							aFilter, aRule[i].SearchExclusion);
					} else {
						this.getView().byId("idRepairAQLeft").setEnabled(false);
						if (!this.getView().byId("idRepairAQLeft").getEnabled()) {
							this.getView().byId("idRepairRemovedQualifierLeft").setEnabled(false);
						}
						this.getView().byId("idRepairAQLeft").setSelectedKey("");
					}
					break;
				}
			}
		},

		/** 
		 * Method to get Applied Qualifier 
		 * @constructor 
		 * @param {String} sCDS - The CDS to retrieve from
		 * @param {String} sProperty - The property of to be binded in the model
		 * @param {String} sPropertyUnfiltered - The property to be binded in the model (unfiltered data)
		 * @param {Array} aFilter - The filter criteria
		 * @param {String} sExclusion - Exclusion criteria
		 */
		_getAppliedQualifier: function (sCDS, sProperty, sPropertyUnfiltered, aFilter, sExclusion) {
			var sPath = "/" + sCDS,
				aComboBoxItem = [],
				aComboBoxItemUnfiltered = [],
				oComboBoxItem,
				sFilter,
				aQualifierAdded = [];

			if (sExclusion) {
				sFilter = "not startswith(CarPart,'" + sExclusion + "')"; //Temporary expecting 1 exclusion only

				this.getModel().read(sPath, {
					filters: aFilter,
					urlParameters: {
						"$filter": sFilter
					},
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							if (sCDS === "ZMPM_CDS_CAR_JOBCODEQUAL") {
								oComboBoxItem.key = oData.results[i].QualifierCode;
								oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
								oComboBoxItem.CarPart = oData.results[i].CarPart;
							} else if (sCDS === "ZMPM_CDS_CAR_CARPARTJCD_AQ") {
								oComboBoxItem.key = oData.results[i].CarPart;
								oComboBoxItem.text = oData.results[i].CarPartDescription;
								oComboBoxItem.CarPart = oData.results[i].CarPart;
							}
							var sKey = oComboBoxItem.key;
							aComboBoxItemUnfiltered.push(oComboBoxItem);

							if (aQualifierAdded.indexOf(sKey) === -1) {
								aComboBoxItem.push(oComboBoxItem);
							}

							aQualifierAdded.push(sKey);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						this.getModel("RepairsModel").setProperty(sPropertyUnfiltered, aComboBoxItemUnfiltered);
					}.bind(this)

				});
			} else {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							if (sCDS === "ZMPM_CDS_CAR_JOBCODEQUAL") {
								oComboBoxItem.key = oData.results[i].QualifierCode;
								oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
								oComboBoxItem.CarPart = oData.results[i].CarPart;
							} else if (sCDS === "ZMPM_CDS_CAR_CARPARTJCD_AQ") {
								oComboBoxItem.key = oData.results[i].CarPart;
								oComboBoxItem.text = oData.results[i].CarPartDescription;
								oComboBoxItem.CarPart = oData.results[i].CarPart;
							}
							var sKey = oComboBoxItem.key;
							aComboBoxItemUnfiltered.push(oComboBoxItem);

							if (aQualifierAdded.indexOf(sKey) === -1) {
								aComboBoxItem.push(oComboBoxItem);
							}

							aQualifierAdded.push(sKey);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						this.getModel("RepairsModel").setProperty(sPropertyUnfiltered, aComboBoxItemUnfiltered);
					}.bind(this)
				});
			}
		},

		/** 
		 * Method to determine Removed Qualifier
		 * @constructor 
		 * @param {String} sRemovedJobCode - Removed Job Code
		 * @param {Object} oJobCode - The Removed Job Code's context
		 * @param {String} sInput - Input Key
		 */
		_determineRemovedQualifier: function (sRemovedJobCode, oJobCode, sInput) {
			//Check against Rule in Removed Qualifier
			var aRule = this.getModel("RepairConfig").getProperty("/RemovedQualifier");
			var aFilter;

			switch (sInput) {
			case "idRepairRJC":
				for (var i = 0; i < aRule.length; i++) {
					if (this._compareRule(oJobCode.JobCodeOperationTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
						//Check if any Search Table, disable Applied Qualifier if not found
						if (aRule[i].SearchTable) {
							if (this._compareRule(sRemovedJobCode, "NEW", "99")) {
								aFilter = [new Filter({
									path: "JobCode",
									operator: FilterOperator.EQ,
									value1: sRemovedJobCode,
									and: true
								})];
							} else {
								aFilter = [];
							}
							this.getView().byId("idRepairRemovedQualifier").setEnabled(true);
							this._getRemovedQualifier(aRule[i].SearchTable, "/comboBoxValues/RemovedQualifier", aFilter, aRule[i].SearchExclusion);
						} else {
							this.getView().byId("idRepairRemovedQualifier").setEnabled(false);
							this.getView().byId("idRepairRemovedQualifier").setSelectedKey("");
						}
						break;
					}
				}
				break;
			case "idRepairRJCLeft":
				for (i = 0; i < aRule.length; i++) {
					if (this._compareRule(oJobCode.JobCodeOperationTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
						//Check if any Search Table, disable Applied Qualifier if not found
						if (aRule[i].SearchTable) {
							if (this._compareRule(sRemovedJobCode, "NEW", "99")) {
								aFilter = [new Filter({
									path: "JobCode",
									operator: FilterOperator.EQ,
									value1: sRemovedJobCode,
									and: true
								})];
							} else {
								aFilter = [];
							}
							this.getView().byId("idRepairRemovedQualifier").setEnabled(true);
							this._getRemovedQualifier(aRule[i].SearchTable, "/comboBoxValues/RemovedQualifierLeft", aFilter, aRule[i].SearchExclusion);
						} else {
							this.getView().byId("idRepairRemovedQualifierLeft").setEnabled(false);
							this.getView().byId("idRepairRemovedQualifierLeft").setSelectedKey("");
						}
						break;
					}
				}
				break;
			}
		},

		/** 
		 * Method to get Removed Qualifier
		 * @constructor 
		 * @param {String} sCDS - The CDS to be retrieved from
		 * @param {String} sProperty - The property to be binded in the model
		 * @param {Array } aFilter - The filter criteria
		 * @param {String} sExclusion - Exclusion criteria
		 */
		_getRemovedQualifier: function (sCDS, sProperty, aFilter, sExclusion) {
			var sPath = "/" + sCDS,
				aComboBoxItem = [],
				aComboBoxItemUnfiltered = [],
				oComboBoxItem,
				sFilter,
				aQualifierAdded = [];

			if (sExclusion) {
				sFilter = "not startswith(CarPart,'" + sExclusion + "')"; //Temporary expecting 1 exclusion only

				this.getModel().read(sPath, {
					filters: aFilter,
					urlParameters: {
						"$filter": sFilter
					},
					success: function (oData) {
							for (var i = 0; i < oData.results.length; i++) {
								oComboBoxItem = {};
								if (sCDS === "ZMPM_CDS_CAR_JOBCODEQUAL") {
									oComboBoxItem.key = oData.results[i].QualifierCode;
									oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
									oComboBoxItem.CarPart = oData.results[i].CarPart;
								} else if (sCDS === "ZMPM_CDS_CAR_CARPARTJCD_AQ") {
									oComboBoxItem.key = oData.results[i].CarPart;
									oComboBoxItem.text = oData.results[i].CarPartDescription;
									oComboBoxItem.CarPart = oData.results[i].CarPart;
								}
								var sKey = oComboBoxItem.key;
								aComboBoxItemUnfiltered.push(oComboBoxItem);

								if (aQualifierAdded.indexOf(sKey) === -1) {
									aComboBoxItem.push(oComboBoxItem);
								}

								aQualifierAdded.push(sKey);
							}
							this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						}.bind(this)
				});
			} else {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
							for (var i = 0; i < oData.results.length; i++) {
								oComboBoxItem = {};
								if (sCDS === "ZMPM_CDS_CAR_JOBCODEQUAL") {
									oComboBoxItem.key = oData.results[i].QualifierCode;
									oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
									oComboBoxItem.CarPart = oData.results[i].CarPart;
								} else if (sCDS === "ZMPM_CDS_CAR_CARPARTJCD_AQ") {
									oComboBoxItem.key = oData.results[i].CarPart;
									oComboBoxItem.text = oData.results[i].CarPartDescription;
									oComboBoxItem.CarPart = oData.results[i].CarPart;
								}
								var sKey = oComboBoxItem.key;
								aComboBoxItemUnfiltered.push(oComboBoxItem);

								if (aQualifierAdded.indexOf(sKey) === -1) {
									aComboBoxItem.push(oComboBoxItem);
								}

								aQualifierAdded.push(sKey);
							}
							this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						}.bind(this)

				});
			}
		},
		
		/** 
		 * Determine if AJC and Why Made Code correspond to MD115 report requirement
		 * @private 
		 * @param {String} sWheelSide - Side of wheelset to check if AJC and Why Made correspond to MD115
		 */
		_setMD115FromAJCAndWhyMade: function (sWheelSide) {
			var oModel = this.getModel("addCIDView");
			
			if (!oModel) {
				return;
			}
			var mAJCWhyMade = oModel.getProperty("/AJCRuleWhyMadeMap");
			var mAppliedJobCodeRules = oModel.getProperty("/AJCRuleMap");
			var sAppliedJobCode = oModel.getProperty("/response/WrAppliedJobCode" + sWheelSide);
			var sRule = mAppliedJobCodeRules[sAppliedJobCode];
			var sWhyMade = oModel.getProperty("/response/WrWhyMadeCode" + sWheelSide);
			
			// AJC and WhyMade not null and corresponds to MD-115 rule
			if (sRule && sWhyMade && (mAJCWhyMade["R" + sRule + "W" + sWhyMade] === "MD-115")) {
				oModel.setProperty("/md115Required" + sWheelSide, true);
			} else {
				oModel.setProperty("/md115Required" + sWheelSide, false);
			}
		}
	});
});