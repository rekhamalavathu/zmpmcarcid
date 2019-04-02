sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
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
				if (appliedJobCode === "") {
					this.getView().byId("idRepairAJC").setValue("");
					this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.Error);

					return;
				} else {
					this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.None);
					this.byId("idRepairRJC").setSelectedKey("");
					this.byId("idRepairRJC").setValue("");
				}
				//Get property of the applied job code
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: appliedJobCode
				});

				oJobCode = this.getModel().getProperty(sPath);

				//Check Applied Qualifier Rule
				this.getView().byId("idRepairAQ").setSelectedKey("");
				this._determineAppliedQualifier(appliedJobCode, oJobCode.JobCodeOperationTypeID);
				//Check Condition Code
				this._determineConditionCode();
				//Check Why Made Code
				this._determineWhyMadeCode();
				// Check Removed Job Code
				this._getRemovedJobCode();
				break;

				// Left Wheel
			case "idRepairAJCLeft":
				if (appliedJobCodeLeft === "") {
					this.getView().byId("idRepairAJCLeft").setValue("");
					this.getView().byId("idRepairAJCLeft").setValueState(sap.ui.core.ValueState.Error);

					return;
				} else {
					this.getView().byId("idRepairAJCLeft").setValueState(sap.ui.core.ValueState.None);
					this.byId("idRepairRJCLeft").setSelectedKey("");
					this.byId("idRepairRJCLeft").setValue("");
				}
				//Get property of the applied job code
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: appliedJobCodeLeft
				});

				oJobCode = this.getModel().getProperty(sPath);
				//Check Applied Qualifier Rule
				this.getView().byId("idRepairAQLeft").setSelectedKey("");
				this._determineAppliedQualifierLeft(appliedJobCodeLeft, oJobCode.JobCodeOperationTypeID);
				//Check Condition Code
				this._determineConditionCodeLeft();
				//Check Why Made Code
				this._determineWhyMadeCodeLeft();
				// Check Removed Job Code
				this._getRemovedJobCodeLeft();
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

			switch (sInputId) {
			case "idRepairRJC":
				var removedJobCode = this.getView().byId("idRepairRJC").getSelectedKey();
				if (removedJobCode === "") {
					this.getView().byId("idRepairRJC").setValue("");
					this.getView().byId("idRepairRJC").setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this.getView().byId("idRepairRJC").setValueState(sap.ui.core.ValueState.None);
				}
				if (removedJobCode) {
					this._getRemovedQualifier(removedJobCode, "idRepairRemovedQualifier");
				}
				this._determineWhyMadeCode();
				break;
			case "idRepairRJCLeft":
				var removedJobCodeLeft = this.getView().byId("idRepairRJCLeft").getSelectedKey();
				if (removedJobCodeLeft === "") {
					this.getView().byId("idRepairRJCLeft").setValue("");
					this.getView().byId("idRepairRJCLeft").setValueState(sap.ui.core.ValueState.Error);
					return;
				} else {
					this.getView().byId("idRepairRJCLeft").setValueState(sap.ui.core.ValueState.None);
				}
				if (removedJobCodeLeft) {
					this._getRemovedQualifier(removedJobCodeLeft, "idRepairRemovedQualifierLeft");
				}
				this._determineWhyMadeCodeLeft();
				break;
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
					ConditionCode: [],
					RemovedJobCode: [],
					RemovedQualifier: [],
					WhyMadeCode: [],
					Location: [],
					AppliedJobCodeLeft: [],
					AppliedQualifierLeft: [],
					ConditionCodeLeft: [],
					RemovedJobCodeLeft: [],
					RemovedQualifierLeft: [],
					WhyMadeCodeLeft: []
				}
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

		/**
		 * to get Applied Job Code value for Right Wheel
		 * @private
		 */
		_getAppliedJobCode: function () {
			var dateTime = new Date();
			var aFilter = [new sap.ui.model.Filter({
					path: "EffectiveDate",
					operator: sap.ui.model.FilterOperator.LE,
					value1: dateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ExpirationDate",
					operator: sap.ui.model.FilterOperator.GE,
					value1: dateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "AppliedRemovedIndicator",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: "B",
					and: true
				})
			];
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode").then(function (sStatus) {
				this.getModel("addCIDView").setProperty("/busy", false);
			}.bind(this));
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode");
		},

		/**
		 * to get Applied Job Code value for Left Wheel
		 * @private
		 */
		_getAppliedJobCodeLeft: function () {
			var dateTime = new Date();
			var aFilter = [new sap.ui.model.Filter({
					path: "EffectiveDate",
					operator: sap.ui.model.FilterOperator.LE,
					value1: dateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ExpirationDate",
					operator: sap.ui.model.FilterOperator.GE,
					value1: dateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "AppliedRemovedIndicator",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: "B",
					and: true
				})
			];
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCodeLeft").then(function (sStatus) {
				this.byId("idRepairAJCLeft").setBusy(false);
			}.bind(this));
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCodeLeft");
		},

		/**
		 * to get Applied Job Code value and bind data to corresponding combo box
		 * @private
		 * @param {Array} aFilter - array that contains filter condition to query CDS
		 * @param {String} sProperty - combo box name
		 */
		_getJobCode: function (aFilter, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_REPAIR_JOBCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].JobCode;
							oComboBoxItem.text = oData.results[i].JobCodeDescription;
							aComboBoxItem.push(oComboBoxItem);
						}
						this._aAppliedJobCodeResults = oData.results;
						this._aAppliedJobCode = aComboBoxItem;
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve("Completed");
					}.bind(this),
					error: function (sMsg) {
						resolve("Error");
					}
				});
			}.bind(this));
		},

		/**
		 * to get Condition Code value for Right Wheel
		 * @private
		 */
		_determineConditionCode: function () {
			var aFilter;
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

			if (appliedJobCode === "") {
				return;
			}

			aFilter = [new sap.ui.model.Filter({
				path: "JobCode",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: appliedJobCode,
				and: true
			})];

			this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter, "idRepairCondCode");
		},

		/**
		 * to get Condition Code value for Left Wheel
		 * @private
		 */
		_determineConditionCodeLeft: function () {
			var aFilter;
			var appliedJobCode = this.getView().byId("idRepairAJCLeft").getSelectedKey();

			if (appliedJobCode === "") {
				return;
			}

			aFilter = [new sap.ui.model.Filter({
				path: "JobCode",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: appliedJobCode,
				and: true
			})];

			this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCodeLeft", aFilter, "idRepairCondCodeLeft");
		},

		/**
		 * to get Condition Code value and bind data to corresponding combo box
		 * @private
		 * @param {String} sPath - CDS path
		 * @param {String} sProperty - combo box name
		 * @param {Array} aFilter - array that contains filter condition to query CDS
		 * @param {String} sInput - Input field ID
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
				}.bind(this),
				error: function (sMsg) {

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
			var oAppliedJobCode;
			var aFilter;
			var sPath;

			//All must filled
			if (oContext.WrAppliedJobCodeRight === undefined || oContext.WrRemovedJobCodeRight === undefined || responsibilityCode ===
				undefined ||
				oContext.WrAppliedJobCodeRight === "" ||
				oContext.WrRemovedJobCodeRight === "" || responsibilityCode === "" || oContext.WrConditionCodeRight === undefined ||
				oContext.WrConditionCodeRight === "") {
				return;
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJobCodeRight
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "AppliedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrAppliedJobCodeRight,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "RemovedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrRemovedJobCodeRight,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ResponsibilityCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: responsibilityCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oAppliedJobCode.PriceMasterID,
					and: true
				})
			];

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
			var oAppliedJobCode;
			var aFilter;
			var sPath;

			//All must filled
			if (oContext.WrAppliedJobCodeLeft === undefined || oContext.WrRemovedJobCodeLeft === undefined || responsibilityCode === undefined ||
				oContext.WrAppliedJobCodeLeft === "" ||
				oContext.WrRemovedJobCodeLeft === "" || responsibilityCode === "" || oContext.WrConditionCodeLeft === undefined ||
				oContext.WrConditionCodeLeft === "") {
				return;
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJobCodeLeft
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "AppliedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrAppliedJobCodeLeft,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "RemovedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrRemovedJobCodeLeft,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ResponsibilityCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: responsibilityCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oAppliedJobCode.PriceMasterID,
					and: true
				})
			];

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
				JobCode: oContext.WrAppliedJobCodeRight
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrAppliedJobCodeRight,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oAppliedJobCode.PriceMasterID,
					and: true
				})
			];
			this.getView().byId("idRepairRJC").setSelectedKey("");
			this._getJobCodeCouplet(aFilter, "/comboBoxValues/RemovedJobCode", false).then(function (aItems) {
				if (aItems.length === 1) {
					//If only 1 Item, set default
					this.getView().byId("idRepairRJC").setSelectedKey(aItems[0].key);
					this._determineWhyMadeCode();
					this._getRemovedQualifier(aItems[0].key, "idRepairRemovedQualifier");
				}
				this._determineConditionCode();
				this._determineAppliedQualifier(oContext.WrAppliedJobCodeRight, oAppliedJobCode.JobCodeOperationTypeID);

			}.bind(this));
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

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJobCodeLeft
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrAppliedJobCodeLeft,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oAppliedJobCode.PriceMasterID,
					and: true
				})
			];
			this.getView().byId("idRepairRJCLeft").setSelectedKey("");
			this._getJobCodeCouplet(aFilter, "/comboBoxValues/RemovedJobCodeLeft", false).then(function (aItems) {
				if (aItems.length === 1) {
					//If only 1 Item, set default
					this.getView().byId("idRepairRJCLeft").setSelectedKey(aItems[0].key);
					this._determineWhyMadeCodeLeft();
					this._getRemovedQualifier(aItems[0].key, "idRepairRemovedQualifierLeft");
				}
				this._determineConditionCodeLeft();
				this._determineAppliedQualifierLeft(oContext.WrAppliedJobCodeLeft, oAppliedJobCode.JobCodeOperationTypeID);
			}.bind(this));
		},

		/**
		 * to get Job Code couplet value and bind data to corresponding combo box
		 * @private
		 * @param {Array} aFilter - array that contains filter condition to query CDS
		 * @param {String} sProperty - combo box name
		 * @param {Boolean} bAppliedJobCode - Flag for Applied Job Code
		 * @return {object} Promise - return Job Code Couplet context
		 */
		_getJobCodeCouplet: function (aFilter, sProperty, bAppliedJobCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCDCOUPLET";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							if (bAppliedJobCode) {
								oComboBoxItem.key = oData.results[i].JobCode;
								oComboBoxItem.text = oData.results[i].JobCodeDesc;
							} else {
								oComboBoxItem.key = oData.results[i].RemovedJobCode;
								oComboBoxItem.text = oData.results[i].RemovedJobCodeDesc;
							}

							aComboBoxItem.push(oComboBoxItem);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {}.bind(this)
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
								if (aWhyMadeCodeAdded.includes(oData.results[i].WhyMadeCode)) {
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
					}.bind(this),
					error: function (sMsg) {}.bind(this)
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
			//ZCAR_REPAIR_RULE_CONDITION
			switch (sCheck) {
			case "EQ":
				return sLeft === sRight;
			case "NEQ":
				return sLeft !== sRight;
			case "EW":
				return sLeft.endsWith(sRight.toString());
			case "NEW":
				return !sLeft.endsWith(sRight.toString());
			case "SW":
				return sLeft.startsWith(sRight.toString());
			case "NSW":
				return !sLeft.startsWith(sRight.toString());
			default:
				return false;
			}
		},

		_determineAppliedQualifier: function (sAppliedJobCode, sJobCodeOpTypeID) {
			//Check against Rule in Applied Qualifier
			var aRule = this.getModel("RepairConfig").getProperty("/AppliedQualifier");
			var aFilter;
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sJobCodeOpTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
					//Check if any Search Table, disable Applied Qualifier if not found
					if (aRule[i].SearchTable) {
						aFilter = [new sap.ui.model.Filter({
							path: "JobCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: sAppliedJobCode,
							and: true
						})];
						this.getView().byId("idRepairAQ").setEnabled(true);

						this._sAppliedQualifierSearchTable = "/" + aRule[i].SearchTable;
						this._getAppliedQualifier("idRepairAQ", aRule[i].SearchTable, "/comboBoxValues/AppliedQualifier", aFilter, aRule[i].SearchExclusion);
					} else {
						this.getView().byId("idRepairAQ").setEnabled(false);
						this.getView().byId("idRepairAQ").setSelectedKey("");
					}

					break;
				}
			}
		},

		_determineAppliedQualifierLeft: function (sAppliedJobCode, sJobCodeOpTypeID) {
			//Check against Rule in Applied Qualifier
			var aRule = this.getModel("RepairConfig").getProperty("/AppliedQualifier");
			var aFilter;
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sJobCodeOpTypeID, aRule[i].JobCodeOpTypeIDCheck, aRule[i].JobCodeOpTypeID)) {
					//Check if any Search Table, disable Applied Qualifier if not found
					if (aRule[i].SearchTable) {
						aFilter = [new sap.ui.model.Filter({
							path: "JobCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: sAppliedJobCode,
							and: true
						})];
						this.getView().byId("idRepairAQLeft").setEnabled(true);

						this._sAppliedQualifierSearchTable = "/" + aRule[i].SearchTable;
						this._getAppliedQualifier("idRepairAQLeft", aRule[i].SearchTable, "/comboBoxValues/AppliedQualifierLeft", aFilter, aRule[i].SearchExclusion);
					} else {
						this.getView().byId("idRepairAQLeft").setEnabled(false);
						this.getView().byId("idRepairAQLeft").setSelectedKey("");
					}

					break;
				}
			}
		},

		_getAppliedQualifier: function (sInputId, sCDS, sProperty, aFilter, sExclusion) {
			var sPath = "/" + sCDS;
			var aComboBoxItem = [];
			var oComboBoxItem;
			var sFilter;

			if (sExclusion) {
				sFilter = "not startswith(CarPart,'" + sExclusion + "')"; //Temporary expecting 1 exclusion only

				this.getModel().read(sPath, {
					urlParameters: {
						"$filter": sFilter
					},
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].QualifierCode;
							oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
							aComboBoxItem.push(oComboBoxItem);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						if (aComboBoxItem.length === 1) {
							this.getView().byId(sInputId).setSelectedKey(aComboBoxItem[0].key);
						}
					}.bind(this),
					error: function (sMsg) {}.bind(this)
				});
			} else {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].QualifierCode;
							oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
							aComboBoxItem.push(oComboBoxItem);
						}
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						if (aComboBoxItem.length === 1) {
							this.getView().byId(sInputId).setSelectedKey(aComboBoxItem[0].key);
						}
					}.bind(this),
					error: function (sMsg) {}.bind(this)
				});
			}
		},

		_getRemovedQualifier: function (sRemovedJobCode, sInputId) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODEQUAL";
			var aFilter;
			var oComboBoxItem;
			var aComboBoxItem = [];

			aFilter = [new sap.ui.model.Filter({
				path: "JobCode",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sRemovedJobCode,
				and: true
			})];

			this.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].QualifierCode;
						oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
						aComboBoxItem.push(oComboBoxItem);
					}
					switch (sInputId) {
					case "idRepairRemovedQualifier":
						this.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifier", aComboBoxItem);
						if (aComboBoxItem.length === 1) {
							this.getView().byId("idRepairRemovedQualifier").setSelectedKey(aComboBoxItem[0].key);
						}
						break;
					case "idRepairRemovedQualifierLeft":
						this.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifierLeft", aComboBoxItem);
						if (aComboBoxItem.length === 1) {
							this.getView().byId("idRepairRemovedQualifierLeft").setSelectedKey(aComboBoxItem[0].key);
						}
						break;
					}

				}.bind(this),
				error: function (sMsg) {}.bind(this)
			});
		}

	});
});