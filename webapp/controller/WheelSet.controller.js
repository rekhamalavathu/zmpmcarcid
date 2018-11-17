sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.WheelSet", {

		onInit: function (oEvent) {
			this.setModel(this._createViewModel(), "RepairsModel");
			this.getModel("RepairsModel").setSizeLimit(10000000);
			this._initScreenValues();

		},

		onChangeMandatory: function (oEvent) {
			var oInput = oEvent.getParameter("newValue");
			var oInputControl = oEvent.getSource();
			var key = oEvent.getSource().getSelectedItem();

			if (oInput === "" && key === null) {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				if (key === null) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}

			}
		},

		onChangeAppliedJobCode: function (oEvent) {
			var sPath;
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
			var oJobCode = {};

			// //Get property of the applied job code
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: appliedJobCode
			});

			oJobCode = this.getModel().getProperty(sPath);

			//Check Description Rule
			// this._determineDescription(appliedJobCode, oContext.AppliedQualifier);

			//Check Condition Code
			this._determineConditionCode();

			//Check Why Made Code
			this._determineWhyMadeCode();

			// //Determine Removed Job Code
			this._getRemovedJobCode();

			//Check Material Number Rule
			this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);

		},

		onValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getSelectedKey();
			var sTitle, sPath;

			this._sInputId = oEvent.getSource().getId();

			switch (this.getElementRealID(this._sInputId)) {
			case "idRepairMaterial":
				sTitle = this.getResourceBundle().getText("materialDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/MaterialNumber";
				break;
			case "idRepairAJC":
				sTitle = this.getResourceBundle().getText("appliedJobCodeDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/AppliedJobCode";
				break;
			case "idRepairRJC":
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
			var oContext = this.getModel("addCIDView").getProperty("/response");

			if (oSelectedItem) {
				this.byId(this._sInputId).setSelectedKey(oSelectedItem.getTitle());
			}
			oEvent.getSource().getBinding("items").filter([]);

			switch (this.getElementRealID(this._sInputId)) {
			case "idRepairMaterial":
				this.handleChangeMaterialNumber(oContext.WsAppliedJobCode, oContext.Material, oContext.WsConditionCode,
					this._sContextPath);
				break;
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
			case "idRepairMaterial":
				this.handleChangeMaterialNumber();
				break;
			}
		},

		handleChangeMaterialNumber: function () {
			var sPath;
			var oMaterial;
			var aRule;
			var bIsMismatch;
			var sReplaceCondCode;
			// var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oContext = this.getModel("addCIDView").getProperty("/response");

			if (oContext.WsAppliedJobCode !== "" && oContext.Material !== "") {
				sPath = this.getModel().createKey(this._sMaterialNumberSearch, {
					jobcode: oContext.WsAppliedJobCode,
					matnr: oContext.Material
				});

				oMaterial = this.getModel().getProperty(sPath);
			}

			//Populate Description
			if (oMaterial === undefined) {
				return;
			}

			// oContext.MaterialDescription = oMaterial.maktx;
			//Check against Rule in Material Condition Code
			aRule = this.getModel("RepairConfig").getProperty("/MaterialConditionCode");
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oContext.Material, aRule[i].MaterialCodeCheck, parseInt(aRule[i].MaterialCode, 10))) {
					if (oContext.WsConditionCode !== aRule[i].ConditionCode) {
						sReplaceCondCode = aRule[i].ConditionCode;
						bIsMismatch = true;
					}
					break;
				}
			}

			if (bIsMismatch) {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					this.getResourceBundle().getText("conditionCodeMismatch", [aRule[i].ConditionCode, oContext.WsConditionCode]), {
						actions: [this.getResourceBundle().getText("overwriteConditionCode"), this.getResourceBundle().getText(
							"reselectMaterial")],
						styleClass: bCompact ? "sapUiSizeCompact" : "",
						onClose: function (sAction) {
							if (sAction === this.getResourceBundle().getText("overwriteConditionCode")) {
								oContext.WsConditionCode = sReplaceCondCode;
							} else if (sAction === this._oController.getResourceBundle().getText(
									"reselectMaterial")) {
								oContext.Material = "";
								// oContext.MaterialDescription = "";
							}
							// this._oController.getModel("WOModel").updateBindings(true);
						}.bind(this)
					}
				);
			} else {
				//Determine Material Quantity
				if (oContext.WsConditionCode !== "" && oContext.Material != "") {
					this._determineMaterialResQuantity();
				}
			}
		},

		handleChangeRemovedJobCodeAJC: function () {
			// var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oContext = this.getModel("addCIDView").getProperty("/response");

			// if (oContext.WsRemovedJobCode) {
			// 	//Get Removed Qualifier
			// 	this._getRemovedQualifier(oContext.RemovedJobCode);

			// } else {
			this.getModel("RepairsModel").setProperty("/comboBoxValues/ConditionCode", []);
			// }

			// this._oController.byId("idRepairWhyMade08").setEnabled(false);

			//Determine Quantity Removed Job Code
			// this.determineQuantityRJC();

			//Determine Why Made C
			this._determineWhyMadeCode();
		},

		getElementRealID: function (sSourceID) {
			return sSourceID.split("--")[1];
		},

		onChangeConditionCode: function (oEvent) {
			// var oContext = this.getModel("addCIDView").getProperty(this._sContextPath);
			var key = oEvent.getSource().getSelectedItem();
			var materialNumber = this.getView().byId("idRepairMaterial").getValue();

			//Check Why Made Code
			this._determineWhyMadeCode();

			//Determine Material Stock Quantity
			if (key !== "" && materialNumber != "") {
				this._determineMaterialResQuantity();
			}

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
			// this._getResponsibilityCode("/comboBoxValues/ResponsibilityCode");

			this._getAppliedJobCode();
			// 	this._getRemovedJobCode("RJC");

			this._getMaterialNumber("ZMPM_CDS_CAR_JOBCD_MAT", "/comboBoxValues/MaterialNumber");
			this._getMaterialCondCode(null, "/comboBoxValues/ConditionCode");

			// }
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
			this.getModel("app").setProperty("/addCidBusy", true);
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode").then(function (sStatus) {
				this.getModel("app").setProperty("/addCidBusy", false);
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

		_getMaterialCondCode: function (aFilter, sProperty) {
			var aComboBoxItem = [];
			var oComboBoxItem;

			this.getModel().read("/ZMPM_CDS_CAR_MATERIALCONDCD", {
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
			if (oContext.WsAppliedJobCode === undefined || oContext.WsRemovedJobCode === undefined || responsibilityCode === undefined ||
				oContext.WsAppliedJobCode === "" ||
				oContext.WsRemovedJobCode === "" || responsibilityCode === "" || oContext.ConditionCode === undefined ||
				oContext.ConditionCode === "") {
				return;
			}

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: oContext.WsAppliedJobCode
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
					value1: oContext.WsRemovedJobCode,
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

		_determineMaterialResQuantity: function () {
			var oContext = this.getModel("WOModel").getProperty(this._sContextPath),
				aRule = this.getModel("RepairConfig").getProperty("/MaterialReservation"),
				oWheelSet = this.getModel("addCIDView").getProperty("/response"),
				// location = this.getModel("addCIDView").getProperty("/cidHeader/location"),
				sPath;

			//Determine Material Reservation
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oWheelSet.ConditionCode, aRule[i].ConditionCodeCheck, aRule[i].ConditionCode)) {
					oContext.StorageLocation = this.getModel("WOModel").getProperty("/WheelsetsLocation");
					oContext.SpecialStock = aRule[i].SpecialStock;
					oContext.VendorNumber = aRule[i].Vendor;
					break;
				} else {
					oContext.StorageLocation = this.getModel("WOModel").getProperty("/RepairsLocation");
				}
			}

			//Read Material Quantity
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_MATSTOCK", {
				Material: oWheelSet.Material,
				StorageLocation: oContext.StorageLocation,
				Plant: this.getModel("WOModel").getProperty("/Plant")
			});

			this.getModel().read(sPath, {
				success: function (oData) {
					oContext.QuantityOnHand = parseInt(oData.UnrestrictedUse, 10);
					oContext.QuantityAvailable = oData.UnrestrictedUse - oData.Reserved;
					this.getModel("WOModel").updateBindings(true);
					var oViewModel = this.getModel("addCIDView");
					oViewModel.setProperty("/response/MaterialQoh", oContext.QuantityOnHand);
					oViewModel.setProperty("/response/MaterialQav", oContext.QuantityAvailable);
				}.bind(this)
			});
		},

		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var wheelsetAppJobCode = this.getModel("addCIDView").getProperty("/response/WsAppliedJobCode"),

				//Get Applied Job Code context
				sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: wheelsetAppJobCode
				});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: wheelsetAppJobCode,
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

		_determineMaterialNumber: function (sAppliedJobCode, sConditionCode) {
			//Check against Rule in Description
			var aRule = this.getModel("RepairConfig").getProperty("/MaterialNumber");
			// var aRule = this.getModel("addCIDView").getProperty("/response/Material");
			var aFilter;

			this.getView().byId("idRepairMaterial").setValue("");
			this.getView().byId("idRepairMaterial").setShowValueHelp(true);
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sAppliedJobCode, aRule[i].AppliedJobCodeCheck, parseInt(aRule[i].AppliedJobCode, 10))) {
					if (aRule[i].ConditionCodeCheck === "" || aRule[i].ConditionCode === "") {
						if (aRule[i].MaterialNumRequired) {
							this.getView().byId("idRepairMaterial").setValue("");
							this.getView().byId("idRepairMaterial").setShowValueHelp(false);
							this.getView().byId("idRepairMaterial").setRequired(true);
						}
					}

					if (this._compareRule(sConditionCode, aRule[i].ConditionCodeCheck, aRule[i].ConditionCode)) {

						if (aRule[i].SearchTable === "") {
							this.getModel("RepairsModel").setProperty("/comboBoxValues/MaterialNumber", []);
						} else {
							aFilter = [new sap.ui.model.Filter({
								path: "jobcode",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: sAppliedJobCode,
								and: true
							})];
							// this._getMaterialNumber(aRule[i].SearchTable, "/comboBoxValues/MaterialNumber", aFilter).then(function (aItems) {
							// 	if (aItems.length > 0) {
							// 		this.getView().byId("idRepairMaterialCalculator").setEnabled(true);
							// 	} else if (aItems.length === 0) {
							// 		this._oController.byId("idRepairMaterialCalculator").setEnabled(false);
							// 	}
							// }.bind(this));
							break;
						}
					}
				}
			}
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

		_getMaterialNumber: function (sCDS, sProperty, aFilter) {
			var sPath = "/" + sCDS;
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].matnr;
							oComboBoxItem.text = oData.results[i].maktx;
							oComboBoxItem.jobcode = oData.results[i].jobcode;
							oComboBoxItem.maktx = oData.results[i].maktx;
							aComboBoxItem.push(oComboBoxItem);
						}
						this._sMaterialNumberSearch = sPath;
						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			}.bind(this));
		},
	});
});