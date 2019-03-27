sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox",
	"sap/ui/model/Filter"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox, Filter) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.WheelSet", {

		onInit: function (oEvent) {
			this.setModel(this._createViewModel(), "RepairsModel");
			this.getModel("RepairsModel").setSizeLimit(10000000);
			this._initScreenValues();
			sap.ui.getCore().getEventBus().subscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);

		},

		onExit: function () {
			sap.ui.getCore().getEventBus().unsubscribe("onLoadRemovedJobCode", this._getRemovedJobCode, this);

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

		onChangeAppliedJobCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();

			// Clear existing value for Material Quantity On Hand and Quantity Available
			this.getView().byId("idQuantityOnHand").setValue("");
			this.getView().byId("idQuantityAvailable").setValue("");

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

			//Check Material Number Rule
			this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);

		},

		onValueHelp: function (oEvent) {
			var sInputValue = oEvent.getSource().getSelectedKey();
			var sTitle, sPath;
			var bMaterial = false;
			var oMaterial = this.getModel("RepairsModel").getProperty("/comboBoxValues/");

			this._sInputId = oEvent.getSource().getId();

			switch (this.getElementRealID(this._sInputId)) {
			case "idRepairMaterial":
				if (oMaterial.MaterialNumber === "" || oMaterial.MaterialNumber === undefined) {
					this._getMaterialNumber("ZMPM_CDS_CAR_JOBCD_MAT", "/comboBoxValues/MaterialNumber");
				}
				sTitle = this.getResourceBundle().getText("materialDialog.Title");
				sPath = "RepairsModel>/comboBoxValues/MaterialNumber";
				bMaterial = true;
				break;
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
				if (bMaterial) {
					this._oValueHelpDialog = new sap.m.TableSelectDialog({
						confirm: [this.onValueHelpConfirm, this],
						cancel: [this.onValueHelpCancel, this],
						search: [this.onValueHelpSearch, this],
						columns: [new sap.m.Column({
								hAlign: "Begin",
								width: "15%",
								header: new sap.m.Label({
									text: this.getResourceBundle().getText("materialDialog.Title")
								})
							}),
							new sap.m.Column({
								hAlign: "Begin",
								popinDisplay: "Inline",
								width: "45%",
								header: new sap.m.Label({
									text: this.getResourceBundle().getText("label.MaterialDescription")
								}),
								minScreenWidth: "Tablet",
								demandPopin: true
							}),
							new sap.m.Column({
								hAlign: "Center",
								width: "20%",
								header: new sap.m.Label({
									text: this.getResourceBundle().getText("label.QuantityOnHand")
								}),
								minScreenWidth: "Tablet",
								demandPopin: true
							}),
							new sap.m.Column({
								hAlign: "Center",
								width: "20%",
								popinDisplay: "Inline",
								header: new sap.m.Label({
									text: this.getResourceBundle().getText("label.QuantityAvailable")
								}),
								minScreenWidth: "Tablet",
								demandPopin: true
							})
						]
					});

					this.getView().addDependent(this._oValueHelpDialog);

					// create the template for the items binding
					this._oTemplate = new sap.m.ColumnListItem({
						type: "Active",
						unread: false,
						cells: [
							new sap.m.Label({
								text: "{RepairsModel>key}"
							}),
							new sap.m.Label({
								text: "{RepairsModel>text}",
								wrapping: true
							}), new sap.m.Label({
								text: "{RepairsModel>QuantityOnHand}"
							}), new sap.m.Label({
								text: "{RepairsModel>QuantityAvailable}"
							})
						]
					});

				} else {
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
				if (typeof (oSelectedItem.getTitle) === "function") {
					this.byId(this._sInputId).setSelectedKey(oSelectedItem.getTitle());
				} else {
					var sSelectedKey = this.getModel("RepairsModel").getProperty(oSelectedItem.getBindingContextPath()).key;
					this.byId(this._sInputId).setSelectedKey(sSelectedKey);
				}
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
			this._oValueHelpDialog.destroy();
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

		handleChangeMaterialNumber: function () {
			var sPath;
			var oMaterial;
			var aRule;
			var bIsMismatch;
			// var sReplaceCondCode;
			var oContext = this.getModel("addCIDView").getProperty("/response");
			var aAllowedConditionCode = [];

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

			//Check against Rule in Material Condition Code
			aRule = this.getModel("RepairConfig").getProperty("/MaterialConditionCode");
			bIsMismatch = true;
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oContext.Material, aRule[i].MaterialCodeCheck, parseInt(aRule[i].MaterialCode, 10))) {
					if (oContext.WsConditionCode === aRule[i].ConditionCode) {
						bIsMismatch = false;
					}
					aAllowedConditionCode.push(aRule[i].ConditionCode);
				}
			}

			if (bIsMismatch) {
				var bCompact = !!this.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					this.getResourceBundle().getText("conditionCodeMismatch", [oContext.Material[oContext.Material.length -
							1],
						aAllowedConditionCode.join(", ")
					]), {
						actions: [this.getResourceBundle().getText("reselectConditionCode"), this.getResourceBundle().getText(
							"reselectMaterial")],
						styleClass: bCompact ? "sapUiSizeCompact" : "",
						onClose: function (sAction) {
							if (sAction === this.getResourceBundle().getText("reselectConditionCode")) {
								oContext.WsConditionCode = "";
								this.getView().byId("idRepairCondCode").setValue("");
								this.getView().byId("idRepairCondCode").open();
							} else if (sAction === this.getResourceBundle().getText(
									"reselectMaterial")) {
								oContext.Material = "";
								this.getView().byId("idRepairMaterial").setValue("");
								this.getView().byId("idRepairMaterial").fireValueHelpRequest();
								this.getView().byId("idQuantityOnHand").setValue("");
								this.getView().byId("idQuantityAvailable").setValue("");
							}
							this.getModel("addCIDView").updateBindings(true);
						}.bind(this)
					}

				);
			} else {
				//Determine Material Quantity
				if (oContext.WsConditionCode !== "" && oContext.Material !== "") {
					this._determineMaterialResQuantity();
				}
			}
		},

		handleChangeRemovedJobCodeAJC: function () {
			//Determine Why Made Code
			this._determineWhyMadeCode();
		},

		getElementRealID: function (sSourceID) {
			return sSourceID.split("--")[1];
		},

		onChangeConditionCode: function (oEvent) {
			var materialNumber = this.getView().byId("idRepairMaterial").getValue();
			var oContext = this.getModel("addCIDView").getProperty("/response");

			//Check Why Made Code
			this._determineWhyMadeCode();

			//Determine Material Number
			this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);

			//Determine Material Stock Quantity
			if (oContext.WsConditionCode !== "" && materialNumber !== "") {
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
				},

				quantityOnHand: "",
				quantityAvailable: ""

			});
		},

		_initScreenValues: function () {
			// obtain initial value for AJC and Material Number
			this._getAppliedJobCode();
			// this._getMaterialNumber("ZMPM_CDS_CAR_JOBCD_MAT", "/comboBoxValues/MaterialNumber");
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
				error: function (sMsg) {}.bind(this)
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
			var aFilter;
			var sPath;

			//All must filled
			if (oContext.WsAppliedJobCode === undefined || oContext.WsRemovedJobCode === undefined || responsibilityCode === undefined ||
				oContext.WsAppliedJobCode === "" ||
				oContext.WsRemovedJobCode === "" || responsibilityCode === "" || oContext.WsConditionCode === undefined ||
				oContext.WsConditionCode === "") {
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
				if (aItems.length === 1) {
					this.getView().byId("idRepairWhyMadeCode").setSelectedKey(aItems[0].key);
				}
			}.bind(this));

		},

		_determineMaterialResQuantity: function () {
			var oRepairLine = this.getModel("WOModel").getProperty("/"),
				oWheelSet = this.getModel("addCIDView").getProperty("/response");

			//Determine Material Reservation
			var oContext = this._getMaterialReservationContext(oRepairLine);
			oRepairLine.StorageLocation = oContext.StorageLocation;
			oRepairLine.SpecialStock = oContext.SpecialStock;
			oRepairLine.VendorNumber = oContext.VendorNumber;

			//Read Material Quantity
			var sPath = this.getModel().createKey("/ZMPM_CDS_CAR_MATSTOCK", {
				Material: oWheelSet.Material,
				StorageLocation: oRepairLine.StorageLocation,
				Plant: this.getModel("WOModel").getProperty("/Plant")
			});

			this.getModel().read(sPath, {
				success: function (oData) {
					// calculate Quantity On Hand & Quantity Available
					oRepairLine.QuantityOnHand = parseInt(oData.UnrestrictedUse, 10);
					oRepairLine.QuantityAvailable = oData.UnrestrictedUse - oData.Reserved;
					oRepairLine.MaterialNotFound = false;
					// this.getModel("WOModel").updateBindings(true);
					var oViewModel = this.getModel("RepairsModel");
					oViewModel.setProperty("/quantityOnHand", oRepairLine.QuantityOnHand);
					oViewModel.setProperty("/quantityAvailable", oRepairLine.QuantityAvailable);
				}.bind(this),
				error: function () {
					oRepairLine.MaterialNotFound = true;
				}
			});
		},

		_getRemovedJobCode: function () {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var AppJobCode = this.getModel("addCIDView").getProperty("/response/WsAppliedJobCode");
			var oContext = this.getModel("addCIDView").getProperty("/response");

			//Get Applied Job Code context
			sPath = this.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: AppJobCode
			});
			oAppliedJobCode = this.getModel().getProperty(sPath);

			aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: AppJobCode,
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
				this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);
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
							this.getView().byId("idRepairMaterial").setSelectedKey("");
							this.getView().byId("idRepairMaterial").setValue("");
							this.getView().byId("idQuantityOnHand").setValue("");
							this.getView().byId("idQuantityAvailable").setValue("");
							this.getView().byId("idRepairMaterial").setValueState("None");
						} else {
							this._getMaterialNumber(aRule[i].SearchTable, "/comboBoxValues/MaterialNumber", sAppliedJobCode);
							break;
						}
					}
				}
			}
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

		_getMaterialNumber: function (sCDS, sProperty, sAppliedJobCode) {
			var sPath = "/" + sCDS;
			var aComboBoxItem = [];
			var oComboBoxItem;
			var aMaterialAdded = [],
				oContext = this.getModel("WOModel").getProperty("/"),
				sStorageLocation = this._getMaterialReservationContext(oContext).StorageLocation,
				oWheelSet = this.getModel("addCIDView").getProperty("/response");

			if (sAppliedJobCode) {
				var aFilter = [new sap.ui.model.Filter({
					path: "jobcode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sAppliedJobCode,
					and: true
				})];
			}

			if (sCDS === "ZMPM_CDS_CAR_MATERIALWITHSTOCK") {
				var oUrlParameters = {};
				aFilter = [new Filter({
						path: "Plant",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: this.getModel("WOModel").getProperty("/Plant"),
						and: true
					}),
					new Filter({
						path: "StorageLocation",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: sStorageLocation,
						and: true
					})
				];
			} else {
				oUrlParameters = {
					"$expand": "to_MaterialStock"
				};
			}

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					filters: aFilter,
					urlParameters: oUrlParameters,

					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							if (aMaterialAdded.indexOf(oData.results[i].matnr) === -1) {
								oComboBoxItem = {};
								oComboBoxItem.key = oData.results[i].matnr;
								oComboBoxItem.text = oData.results[i].maktx;
								oComboBoxItem.jobcode = oData.results[i].jobcode;
								oComboBoxItem.maktx = oData.results[i].maktx;

								if (sCDS === "ZMPM_CDS_CAR_MATERIALWITHSTOCK") {
									oComboBoxItem.QuantityOnHand = parseInt(oData.results[i].UnrestrictedUse, 10);
									oComboBoxItem.QuantityAvailable = oData.results[i].UnrestrictedUse - oData.results[i].Reserved;
								} else {
									oComboBoxItem.QuantityOnHand = this.getResourceBundle().getText("notAvailable");
									oComboBoxItem.QuantityAvailable = this.getResourceBundle().getText("notAvailable");

									for (var x = 0; x < oData.results[i].to_MaterialStock.results.length; x++) {
										if (oData.results[i].to_MaterialStock.results[x].StorageLocation === sStorageLocation &&
											oData.results[i].to_MaterialStock.results[x].Plant === this.getModel("WOModel").getProperty("/Plant")) {
											oComboBoxItem.QuantityOnHand = parseInt(oData.results[i].to_MaterialStock.results[x].UnrestrictedUse, 10);
											oComboBoxItem.QuantityAvailable = oData.results[i].to_MaterialStock.results[x].UnrestrictedUse - oData.results[i].to_MaterialStock
												.results[x].Reserved;
											break;
										}
									}
								}
								aComboBoxItem.push(oComboBoxItem);
							}

							aMaterialAdded.push(oComboBoxItem.key);
						}
						this._sMaterialNumberSearch = sPath;

						if (aMaterialAdded.indexOf(oWheelSet.Material) === -1) {
							this.getView().byId("idRepairMaterial").setSelectedKey("");
							this.getView().byId("idRepairMaterial").setValue("");
							this.getView().byId("idQuantityOnHand").setValue("");
							this.getView().byId("idQuantityAvailable").setValue("");
							this.getView().byId("idRepairMaterial").setValueState("None");
						} else {
							this.handleChangeMaterialNumber();
						}

						this.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						this.getModel("WOModel").updateBindings(true);

						resolve(aComboBoxItem);

					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			}.bind(this));
		},

		_getMaterialReservationContext: function (oRepairLine) {
			var sBadOrderStatus = this.getModel("WOModel").getProperty("/WOHeader/BadOrderStatus"),
				aRule = this.getModel("RepairConfig").getProperty("/MaterialReservation"),
				oWheelSet = this.getModel("addCIDView").getProperty("/response"),
				oContext = {};

			// Determine Material Reservation
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oWheelSet.WsConditionCode, aRule[i].ConditionCodeCheck, aRule[i].ConditionCode)) {
					oContext.StorageLocation = this.getModel("WOModel").getProperty("/WheelsetsLocation");
					oContext.SpecialStock = aRule[i].SpecialStock;
					oContext.VendorNumber = aRule[i].Vendor;
					break;
				} else {
					//If program order, use Program Location; otherwise Repair Location
					if (sBadOrderStatus === "PR") {
						oContext.StorageLocation = this.getModel("WOModel").getProperty("/ProgramLocation");
					} else {
						oContext.StorageLocation = this.getModel("WOModel").getProperty("/RepairsLocation");
					}
				}
			}
			return oContext;
		}
	});
});