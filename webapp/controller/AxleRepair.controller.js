sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.AxleRepair", {

		onInit: function (oEvent) {
			this.setModel(this._createViewModel(), "RepairsModel");
			this.getModel("RepairsModel").setSizeLimit(10000000);
			this._initScreenValues();
			sap.ui.getCore().getEventBus().subscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);

		},

		onExit: function () {
			sap.ui.getCore().getEventBus().unsubscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);

		},

		onChangeAppliedJobCode: function (oEvent) {
			// var sPath;
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

			if (appliedJobCode === "") {
				this.getView().byId("idRepairAJC").setValue("");
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.None);
			}

			//Check Condition Code
			this._determineConditionCode();

			//Check Why Made Code
			this._determineWhyMadeCode();

			// //Determine Removed Job Code
			this._getRemovedJobCode();

		},

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

		onValueHelpCancel: function (oEvent) {
			this._oValueHelpDialog = undefined;
			this._sInputId = undefined;
		},

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

		onSelectRJC: function () {
			var removedJobCode = this.getView().byId("idRepairRJC").getSelectedKey();
			if (removedJobCode === "") {
				this._getRemovedJobCode();
			}
		},

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

		handleChangeRemovedJobCodeAJC: function () {

			//Determine Why Made Code
			this._determineWhyMadeCode();
		},

		getElementRealID: function (sSourceID) {
			return sSourceID.split("--")[1];
		},

		onChangeConditionCode: function (oEvent) {
			// get Condition Code
			this._getConditionCode();

			//Check Why Made Code
			this._determineWhyMadeCode();

		},
		// }
		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
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

		_initScreenValues: function () {

			this._getAppliedJobCode();
		},

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

		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var AxleAppJobCode = this.getModel("addCIDView").getProperty("/response/AxleAppliedJobCode"),

				//Get Applied Job Code context
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: AxleAppJobCode
				});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: AxleAppJobCode,
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
				}
				this._determineConditionCode();
			}.bind(this));
		},

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
		},

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
		}

	});
});