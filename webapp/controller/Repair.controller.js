sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.Repair", {

		onInit: function (oEvent) {
			this.setModel(this._createViewModel(), "RepairsModel");
			this.getModel("RepairsModel").setSizeLimit(10000000);
			this._initScreenValues();

		},

		onChangeAppliedJobCode: function (sInputId) {
			var sPath;
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
			var appliedJobCodeLeft = this.getView().byId("idRepairAJCLeft").getSelectedKey();
			// var appliedJobCode = oEvent.getSource().getSelectedItem();
			var oJobCode = {};
			// var sInputId = this.getElementRealID(oEvent.getSource().getId());

			// //Determine Removed Job Code
			switch (sInputId) {
				// Right Wheel
			case "idRepairAJC":
				// //Get property of the applied job code
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: appliedJobCode
				});

				oJobCode = this.getModel().getProperty(sPath);

				//Check Applied Qualifier Rule
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
				// //Get property of the applied job code
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: appliedJobCodeLeft
				});

				oJobCode = this.getModel().getProperty(sPath);
				//Check Applied Qualifier Rule
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
				sTitle = this.getResourceBundle().getText("removedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/RemovedJobCode";
				break;
			case "idRepairAJCLeft":
				sTitle = this.getResourceBundle().getText("appliedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/AppliedJobCodeLeft";
				break;
			case "idRepairRJCLeft":
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
			// var oContext = this.getModel("addCIDView").getProperty("/response");

			if (oSelectedItem) {
				this.byId(this._sInputId).setSelectedKey(oSelectedItem.getTitle());
			}
			oEvent.getSource().getBinding("items").filter([]);
			// this._sInputId = oEvent.getSource().getId();
			// var sInputId = this.getElementRealID(this._sInputId);
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

		onValueHelpCancel: function (oEvent) {
			this._oValueHelpDialog = undefined;
			this._sInputId = undefined;
		},

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

		onChangeAppliedQualifier: function (oEvent, sInputId) {
			// var aRule = this._oController.getModel("RepairConfig").getProperty("/Description");
			var sPath;
			var oAppliedQualifier = {};
			var oAppliedQualifierLeft = {};
			var oAppliedJobCode = {};
			var oAppliedJobCodeLeft = {};
			var appliedJobCode = "";
			var key = oEvent.getSource().getSelectedItem();

			switch (sInputId) {
			case "idRepairAQ":
				// case "idRepairAJCLeft":
				appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
				break;
			case "idRepairAQLeft":
				// case "idRepairRJCLeft":
				appliedJobCode = this.getView().byId("idRepairAJCLeft").getSelectedKey();
				break;
			}

			//Get Applied Qualifier context
			if (this._sAppliedQualifierSearchTable) {
				sPath = this.getModel().createKey(this._sAppliedQualifierSearchTable, {
					JobCode: appliedJobCode,
					QualifierCode: key
				});
				oAppliedQualifier = this._oController.getModel().getProperty(sPath);
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: appliedJobCode
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			//Reset default property of Description field
			// this._oController.byId("idRepairDescription").setValue("");
			// this._oController.byId("idRepairDescription").setEditable(false);

			// //Check against Rule in Description
			// for (var i = 0; i < aRule.length; i++) {
			// 	if (this._compareRule(sAppliedJobCode, aRule[i].AppliedJobCodeCheck, parseInt(aRule[i].AppliedJobCode, 10))) {
			// 		if (aRule[i].CarPartCheck === "" && aRule[i].CarPart === "") {
			// 			this._checkPopulateDescriptionDefault(aRule[i].PopulateDefault, oAppliedQualifier, oAppliedJobCode);
			// 			break;
			// 		}

			// 		if (oAppliedQualifier) {
			// 			if (this._compareRule(oAppliedQualifier.CarPart, aRule[i].CarPartCheck, aRule[i].CarPart)) {
			// 				this._checkPopulateDescriptionDefault(aRule[i].PopulateDefault, oAppliedQualifier, oAppliedJobCode);
			// 			} else {
			// 				break;
			// 			}
			// 		}
			// 	}
			// }

		},

		handleChangeRemovedJobCodeAJC: function (sInputId) {

			switch (sInputId) {
			case "idRepairAJC":
				var removedJobCode = this.getView().byId("idRepairRJC").getSelectedKey();
				if (removedJobCode) {
					this._getRemovedQualifier(removedJobCode, "idRepairRemovedQualifier");
				} else {
					this.getModel("RepairsModel").setProperty("/comboBoxValues/ConditionCode", []);
				}
				break;
			case "idRepairAJCLeft":
				var removedJobCodeLeft = this.getView().byId("idRepairRJCLeft").getSelectedKey();
				if (removedJobCodeLeft) {
					this._getRemovedQualifier(removedJobCodeLeft, "idRepairRemovedQualifierLeft");
				} else {
					this.getModel("RepairsModel").setProperty("/comboBoxValues/ConditionCodeLeft", []);
				}
				break;
			}

			//Determine Why Made C
			this._determineWhyMadeCode();
		},

		getElementRealID: function (sSourceID) {
			return sSourceID.split("--")[1];
		},

		onChangeConditionCode: function (oEvent) {
			// var oContext = this.getModel("addCIDView").getProperty(this._sContextPath);
			var key = oEvent.getSource().getSelectedItem();
			// var materialNumber = this.getView().byId("idRepairMaterial").getValue();

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

		_initScreenValues: function () {

			this._getAppliedJobCode();
			this._getAppliedJobCodeLeft();
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
			// this.getModel("app").setProperty("/addCidBusy", true);
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode").then(function (sStatus) {
				this.getModel("app").setProperty("/addCidBusy", false);
			}.bind(this));
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode");
		},

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
			// this.byId("idRepairAJCLeft").setBusy(true);
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCodeLeft").then(function (sStatus) {
				this.byId("idRepairAJCLeft").setBusy(false);
			}.bind(this));
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCodeLeft");
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
			// var sPath;
			// var oAppliedJobCode;
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

		_determineConditionCodeLeft: function () {
			var aFilter;
			// var sPath;
			// var oAppliedJobCode;
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

			this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCodeLeft", aFilter);

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
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_determineWhyMadeCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var responsibilityCode = this.getModel("addCIDView").getProperty("/cidHeader/responsibility");
			var oAppliedJobCode;
			// var oRemovedJobCode;
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
					value1: oContext.WsAppliedJobCode,
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
				if (aItems.length === "1") {
					this.getView.byId("idRepairWhyMadeCode").setValue(aItems[0].key);
				}
			}.bind(this));

		},

		_determineWhyMadeCodeLeft: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var responsibilityCode = this.getModel("addCIDView").getProperty("/cidHeader/responsibility");
			var oAppliedJobCode;
			// var oRemovedJobCode;
			var aFilter;
			var sPath;

			//All must filled
			if (oContext.WrAppliedJodCodeLeft === undefined || oContext.WrRemovedJobCodeLeft === undefined || responsibilityCode === undefined ||
				oContext.WrAppliedJodCodeLeft === "" ||
				oContext.WrRemovedJobCodeLeft === "" || responsibilityCode === "" || oContext.WrConditionCodeLeft === undefined ||
				oContext.WrConditionCodeLeft === "") {
				return;
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WrAppliedJodCodeLeft
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "AppliedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.WrAppliedJodCodeLeft,
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
				if (aItems.length === "1") {
					this.getView.byId("idRepairWhyMadeCodeLeft").setValue(aItems[0].key);
				}
			}.bind(this));

		},

		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var wheelAppJobCode = this.getModel("addCIDView").getProperty("/response/WrAppliedJobCodeRight"),

				//Get Applied Job Code context
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: wheelAppJobCode
				});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: wheelAppJobCode,
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
				}
			}.bind(this));
		},

		_getRemovedJobCodeLeft: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var wheelAppJobCode = this.getModel("addCIDView").getProperty("/response/WrAppliedJobCodeLeft"),

				//Get Applied Job Code context
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: wheelAppJobCode
				});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: wheelAppJobCode,
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
				}
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
								// if (aWhyMadeCodeAdded.includes(oData.results[i].WhyMadeCode)) {
								// 	continue;
								// }
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
						this.getView().byId("idRepairAQ").setSelectedKey("");
						this._getView().byId("idRepairAQ").setEnabled(true);

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
						this.getView().byId("idRepairAQLeft").setSelectedKey("");
						this._getView().byId("idRepairAQLeft").setEnabled(true);

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

			// this._oController.getView().byId("idRepairAQ").setBusy(true);
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
						// this._oController.getView().byId("idRepairAQ").setBusy(false);
					}.bind(this),
					error: function (sMsg) {
						// this._oController.getView().byId("idRepairAQ").setBusy(false);
					}.bind(this)
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
						// this._oController.getView().byId("idRepairAQ").setBusy(false);
					}.bind(this),
					error: function (sMsg) {
						// this._oController.getView().byId("idRepairAQ").setBusy(false);
					}.bind(this)
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

			// this._oController.byId("idRepairRemovedQualifier").setBusy(true);
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
						break;
					case "idRepairRemovedQualifierLeft":
						this.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifierLeft", aComboBoxItem);
						break;
					}
					
				}.bind(this),
				error: function (sMsg) {
				}.bind(this)
			});
		}

	});
});