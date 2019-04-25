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
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.AxleRepair", {
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
			sap.ui.getCore().getEventBus().subscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);
		},

		onExit: function () {
			sap.ui.getCore().getEventBus().unsubscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);
		},

		/**
		 * to handle change of Applied Job Code
		 * @public
		 */
		onChangeAppliedJobCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			// var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

			if (oContext.AxleAppliedJobCode === "") {
				this.getView().byId("idRepairAJC").setValue("");
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.None);
				this.byId("idRepairRJC").setSelectedKey("");
				this.byId("idRepairRJC").setValue("");
			}
			if (oContext.AxleAppliedJobCode && oContext.AxleAppliedJobCode !== "0000") {

				//Check Condition Code
				this._determineConditionCode();

				//Check Why Made Code
				this._determineWhyMadeCode();

				// //Determine Removed Job Code
				this._getRemovedJobCode();
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
				this.onChangeAppliedJobCode();
				break;
			case "idRepairRJC":
				this.handleChangeRemovedJobCodeAJC();
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
				this.onChangeAppliedJobCode();
				break;
			case "idRepairRJC":
				this.onChangedRemovedJobCode();
				break;
			}
		},

		/**
		 * to handle on change of Removed Job Code
		 * @public
		 */
		onChangedRemovedJobCode: function () {
			var removedJobCode = this.getView().byId("idRepairRJC").getSelectedKey();

			if (removedJobCode === "") {
				this.getView().byId("idRepairRJC").setValue("");
				this.getView().byId("idRepairRJC").setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this.getView().byId("idRepairRJC").setValueState(sap.ui.core.ValueState.None);
			}
			//Determine Why Made Code
			this._determineWhyMadeCode();
		},

		/**
		 * to handle change of Removed Job Code event
		 * @public
		 */
		handleChangeRemovedJobCodeAJC: function () {
			//Determine Why Made Code
			this._determineWhyMadeCode();
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
		 * to handle change of Condition Code event
		 * @public
		 */
		onChangeConditionCode: function () {
			// get Condition Code
			this._getConditionCode();

			//Check Why Made Code
			this._determineWhyMadeCode();
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
		 * to get screen values during initial load
		 * @private
		 */
		_initScreenValues: function () {
			this._getAppliedJobCode();
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
			}.bind(this));
		},

		/** 
		 * Method to get Job Code
		 * @constructor 
		 * @param {Object} aFilter - The filter criteia
		 * @param {String} sProperty - The property to be binded in the model
		 * @returns {Promise} - Array of items retrieved/Error
		 */
		_getJobCode: function (aFilter, sProperty) {
			var sPath = (sProperty === "/comboBoxValues/AppliedJobCode" ? "/ZMPM_CDS_CAR_APPLIEDJOBCODE" : "/ZMPM_CDS_CAR_REMOVEDJOBCODE");
			var aComboBoxItem = [];
			var oComboBoxItem;
			// var aJobCodes = [];

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					urlParameters: {
						"$orderby": "JobCode"
					},
					filters: aFilter,
					success: function (oData) {
						var sPriceMasterID = this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId");
						var sAppliedRemovedIndicator = (sProperty === "/comboBoxValues/AppliedJobCode" ? "B" : "N");

						//Function to add items
						function addItem(oItem) {
							oComboBoxItem = {};
							oComboBoxItem.key = oItem.JobCode;
							oComboBoxItem.text = oItem.JobCodeDescription;
							aComboBoxItem.push(oComboBoxItem);
							// aJobCodes.push(oItem.JobCode);
						}

						for (var i = 0; i < oData.results.length; i++) {
							if (oData.results[i].EffectiveDate === null && oData.results[i].ExpirationDate === null && oData.results[i].PriceMasterID ===
								"00000000000000000000000000000000000000") {
								addItem(oData.results[i]);
							} else {
								if (sProperty === "/comboBoxValues/AppliedJobCode" && oData.results[i].AppliedRemovedIndicator ===
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === sPriceMasterID) {
									addItem(oData.results[i]);
								} else if (sProperty === "/comboBoxValues/RemovedJobCode" && oData.results[i].AppliedRemovedIndicator !==
									sAppliedRemovedIndicator && oData.results[i].PriceMasterID === sPriceMasterID) {
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
		_determineConditionCode: function () {
			var aFilter;
			// var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
			var oContext = this.getModel("addCIDView").getProperty("/response");

			if (oContext.AxleAppliedJobCode === "") {
				return;
			}

			if (this._compareRule(oContext.AxleAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
					path: "JobCode",
					operator: FilterOperator.EQ,
					value1: oContext.AxleAppliedJobCode,
					and: true
				})];

				this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter);
			} else {
				this._getConditionCode("/ZMPM_CDS_CAR_CONDITIONCODE", "/comboBoxValues/ConditionCode", []);
			}
		},

		/**
		 * to get Condition Code value and bind data to corresponding combo box
		 * @private
		 * @param {string} sPath - CDS path
		 * @param {string} sProperty - combo box name
		 * @param {array} aFilter - array that contains filter condition to query CDS
		 */
		_getConditionCode: function (sPath, sProperty, aFilter) {
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
						this.getView().byId("idRepairCondCode").setSelectedKey(aComboBoxItem[0].key);
					}
				}.bind(this)
			});
		},

		/**
		 * to get Why Made Code value
		 * @private
		 */
		_determineWhyMadeCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var responsibilityCode = this.getModel("addCIDView").getProperty("/cidHeader/responsibility");
			// var oAppliedJobCode;
			var aFilter;
			// var sPath;

			// oAppliedJobCode = this._getRepairJobCode(oContext.WsAppliedJobCode, "AJC");

			//All must filled
			if (oContext.AxleAppliedJobCode === undefined || oContext.AxleRemovedJobCode === undefined || responsibilityCode === undefined ||
				oContext.AxleAppliedJobCode === "" || oContext.AxleRemovedJobCode === "" || responsibilityCode === "") {
				return;
			}
			if (this._compareRule(oContext.AxleAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
						path: "AppliedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.AxleAppliedJobCode,
						and: true
					}),
					new Filter({
						path: "RemovedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.AxleRemovedJobCode,
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
		 * to get Removed Job Code value
		 * @private
		 */
		_getRemovedJobCode: function () {
			var aFilter;
			var oContext = this.getModel("addCIDView").getProperty("/response");

			//Check AJC whether it is end with 99
			if (this._compareRule(oContext.AxleAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: oContext.AxleAppliedJobCode,
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
					this._determineConditionCode();
					this._determineWhyMadeCode();
					// this._oController.getModel("WOModel").updateBindings(true);
				}.bind(this));
			} else {
				//Removed Job Code must equal AJC that ends with 99
				aFilter = [new Filter({
					path: "JobCode",
					operator: FilterOperator.EQ,
					value1: oContext.AxleAppliedJobCode,
					and: true
				})];

				this._getJobCode([], "/comboBoxValues/RemovedJobCode").then(function (sStatus, aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.byId("idRepairRJC").setSelectedKey(aItems[0].key);
					}
					this._determineConditionCode();
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
						// this.getModel("addCIDView").updateBindings(true);
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
									if (aWhyMadeCodeAdded.includes(oData.results[i].WhyMadeCode)) {
										continue;
									}
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
		 * Read JobCode from model
		 * @constructor 
		 * @param {String} sJobCode - The job code to read
		 * @param {String} sJobCodeType - Job Code Type (AJC/RJC/JCP)
		 * @returns {Object} oJobCode - The job code data from model
		 */
		_getRepairJobCode: function (sJobCode, sJobCodeType) {
			switch (sJobCodeType) {
			case "AJC":
				var sCDS = "/ZMPM_CDS_CAR_APPLIEDJOBCODE";
				break;
			case "RJC":
				sCDS = "/ZMPM_CDS_CAR_REMOVEDJOBCODE";
				break;
			case "JCP":
				sCDS = "/ZMPM_CDS_CAR_JOBCDCOUPLET";
				break;
			default:
				sCDS = "/ZMPM_CDS_CAR_APPLIEDJOBCODE";
			}

			if (sJobCodeType === "JCP") {
				if (this._sRepairType === "AJC") {
					var oJobCode = this._getRepairJobCodeCoupletAJC(sJobCode, sCDS);
				}
			} else {
				oJobCode = this._getRepairJobCodeNonCouplet(sJobCode, sCDS);
			}

			return oJobCode;
		},

		/** 
		 * Get Repair Job Code Couplet of Non Couplet scenario
		 * @constructor 
		 * @param {String} sJobCode - Job Code
		 * @param {String} sCDS - The CDS
		 * @returns {Object} - The Job Code object
		 */
		_getRepairJobCodeNonCouplet: function (sJobCode, sCDS) {
			//Read the job code
			var sPath = this.getModel().createKey(sCDS, {
				JobCode: sJobCode,
				PriceMasterID: this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId")
			});

			var oJobCode = this.getModel().getProperty(sPath);

			//If job code is undefined, read with price master ID 0
			if (oJobCode === undefined) {
				sPath = this.getModel().createKey(sCDS, {
					JobCode: sJobCode,
					PriceMasterID: "00000000000000000000000000000000000000"
				});
				oJobCode = this.getModel().getProperty(sPath);
			}

			return oJobCode;
		},

		/** 
		 * Get Why Made Code
		 * @constructor 
		 * @param {String} sProperty - The property of the model to set 
		 * @param {Array} aFilter - The filter object
		 * @returns {Promise} - The list of Why Made Codes added
		 */
		_getWhyMadeCode: function (sProperty, aFilter) {
			var sPath = "/ZMPM_CDS_CAR_WHYMADECODE",
				aComboBoxItem = [],
				aWhyMadeCodeAdded = [],
				oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].whymadecode;
							oComboBoxItem.text = oData.results[i].whymadecodedesc;
							aComboBoxItem.push(oComboBoxItem);
							aWhyMadeCodeAdded.push(oData.results[i].WhyMadeCode);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
						// this.getView().byId("idRepairWhyMadeCode").setBusy(false);
					}.bind(this),
					error: function () {
						// this.getView().byId("idRepairWhyMadeCode").setBusy(false);
					}.bind(this)
				});
			}.bind(this));
		}
	});
});