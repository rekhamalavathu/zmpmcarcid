sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
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
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

			if (appliedJobCode === "") {
				this.getView().byId("idRepairAJC").setValue("");
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.None);
				this.byId("idRepairRJC").setSelectedKey("");
				this.byId("idRepairRJC").setValue("");
			}

			//Check Condition Code
			this._determineConditionCode();

			//Check Why Made Code
			this._determineWhyMadeCode();

			// //Determine Removed Job Code
			this._getRemovedJobCode();

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
		 * to get Applied Job Code value
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
		 * to get Applied Job Code value and bind data to corresponding combo box
		 * @private
		 * @param {array} aFilter - array that contains filter condition to query CDS
		 * @param {string} sProperty - combo box name
		 * @return {object} Promise - return Job Code context
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
		 * to get Condition Code value
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

			this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter);

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
				}.bind(this),
				error: function (sMsg) {

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
			var oAppliedJobCode;
			var aFilter;
			var sPath;

			//All must filled
			if (oContext.AxleAppliedJobCode === undefined || oContext.AxleRemovedJobCode === undefined || responsibilityCode === undefined ||
				oContext.AxleAppliedJobCode === "" ||
				oContext.AxleRemovedJobCode === "" || responsibilityCode === "" || oContext.AxleConditionCode === undefined ||
				oContext.AxleConditionCode === "") {
				return;
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.AxleAppliedJobCode
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "AppliedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.AxleAppliedJobCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "RemovedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.AxleRemovedJobCode,
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
		 * to get Removed Job Code value
		 * @private
		 */
		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var oContext;

			oContext = this.getModel("addCIDView").getProperty("/response");

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.AxleAppliedJobCode
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.AxleAppliedJobCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oAppliedJobCode.PriceMasterID,
					and: true
				})
			];
			this._getJobCodeCouplet(aFilter, "/comboBoxValues/RemovedJobCode", false).then(function (aItems) {
				if (aItems.length === 1) {
					//If only 1 Item, set default
					this.getView().byId("idRepairRJC").setSelectedKey(aItems[0].key);
					// this._determineWhyMadeCode();
				}
				this._determineConditionCode();
				this._determineWhyMadeCode();
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
						this.getModel("addCIDView").updateBindings(true);
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
					}.bind(this),
					error: function (sMsg) {}.bind(this)
				});
			}.bind(this));
		}

	});
});