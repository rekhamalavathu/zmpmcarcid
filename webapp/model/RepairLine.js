sap.ui.define([
	"sap/ui/base/Object",
	"sap/m/MessageBox",
	"sap/ui/model/json/JSONModel"
], function (Object, MessageBox, JSONModel) {
	"use strict";

	return Object.extend("com.nscorp.car.createrepairworkorder.model.RepairLine", {

		constructor: function (oController, sRepairType, sContextPath) {
			this._oController = oController;
			this._sRepairType = sRepairType;
			this._sContextPath = sContextPath;
			this._initScreenValues();
		},

		determineQuantityRJC: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var sQuantity = (oContext.Quantity === "" ? "0" : oContext.Quantity);
			if (oContext.RemovedJobCode !== "") {
				oContext.QuantityRemovedJobCode = sQuantity + "   " + oContext.RemovedJobCode;
			}
			this._oController.getModel("WOModel").updateBindings(true);
		},

		handleChangeResponsibilityCode: function () {
			var sPath;
			var sResponsibilityCode = this._oController.getModel("WOModel").getProperty(this._sContextPath).ResponsibilityCode;
			if (sResponsibilityCode) {
				sPath = "/ZMPM_CDS_CAR_RESPCODE('" + sResponsibilityCode + "')";
				//Enable Incident Related if Responsibility Code has the flag
				if (this._oController.getModel().getProperty(sPath).IncidentRelated) {
					this._oController.byId("idRepairIncRelated").setEnabled(true);
				} else {
					this._oController.byId("idRepairIncRelated").setEnabled(false);
				}
			} else {
				this._oController.byId("idRepairIncRelated").setEnabled(false);
			}

			this._determineWhyMadeCode();
		},

		handleChangeAppliedJobCodeAJC: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oJobCode = {};
			var sPath;

			if (oContext.AppliedJobCode) {
				//Enable Wrong Repair field
				this._oController.byId("idRepairWrongRepair").setEnabled(true);

				//Get property of the applied job code
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.AppliedJobCode
				});

				oJobCode = this._oController.getModel().getProperty(sPath);

				//Check Applied Qualifier Rule
				this._determineAppliedQualifier(oContext.AppliedJobCode, oJobCode.JobCodeOperationTypeID);

				//Check Description Rule
				this._determineDescription(oContext.AppliedJobCode, oContext.AppliedQualifier);

				//Check Condition Code
				this._determineConditionCode(oContext);

				//Check Why Made Code
				this._determineWhyMadeCode();

				//Check Removed Job Code
				this._getRemovedJobCode("AJC");

				//Check Material Number Rule
				this._determineMaterialNumber(oContext.AppliedJobCode, oContext.ConditionCode);

				//Check Material Cost Per Unit
				this._determineMaterialCost(oContext.AppliedJobCode);

				//Get Location
				this._getLocationByJobCode("/comboBoxValues/Location", oContext.AppliedJobCode);
			} else {
				this._oController.byId("idRepairWrongRepair").setEnabled(false);
				this._oController.byId("idRepairWhyMade08").setEnabled(false);
			}
		},

		handleChangeAppliedJobCodeRJC: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oJobCode = {};
			var sPath;

			if (oContext.AppliedJobCode) {
				//Get property of the applied job code
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.AppliedJobCode
				});

				oJobCode = this._oController.getModel().getProperty(sPath);

				//Check Applied Qualifier Rule
				this._determineAppliedQualifier(oContext.AppliedJobCode, oJobCode.JobCodeOperationTypeID);

				//Check Description Rule
				this._determineDescription(oContext.AppliedJobCode, oContext.AppliedQualifier);

				//Check Condition Code
				this._determineConditionCode(oContext);

				//Check Material Cost Per Unit
				this._determineMaterialCost(oContext.AppliedJobCode);

			} else {
				this._oController.byId("idRepairWrongRepair").setEnabled(false);
				this._oController.byId("idRepairWhyMade08").setEnabled(false);
			}
		},

		handleChangeAppliedJobCodeMAT: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oJobCode = {};
			var sPath;

			if (oContext.AppliedJobCode) {
				//Get property of the applied job code
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.AppliedJobCode
				});

				oJobCode = this._oController.getModel().getProperty(sPath);
				
				//Check Applied Qualifier Rule
				this._determineAppliedQualifier(oContext.AppliedJobCode, oJobCode.JobCodeOperationTypeID);

				//Check Description Rule
				this._determineDescription(oContext.AppliedJobCode, oContext.AppliedQualifier);

				//Check Condition Code
				this._determineConditionCode(oContext);

				//Check Material Cost Per Unit
				this._determineMaterialCost(oContext.AppliedJobCode);
				
				//Determine Removed Job Code
				this._getRemovedJobCode("AJC");

			} else {
				this._oController.byId("idRepairWrongRepair").setEnabled(false);
				this._oController.byId("idRepairWhyMade08").setEnabled(false);
			}
		},

		handleChangeAppliedQualifier: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);

			//Check Decsription Rule
			this._determineDescription(oContext.AppliedJobCode, oContext.AppliedQualifier);
		},

		handleChangeRemovedJobCodeAJC: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);

			if (oContext.RemovedJobCode) {
				//Get Removed Qualifier
				this._getRemovedQualifier(oContext.RemovedJobCode);

			} else {
				this._oController.getModel("RepairsModel").setProperty("/comboBoxValues/ConditionCode", []);
			}

			this._oController.byId("idRepairWhyMade08").setEnabled(false);

			//Determine Quantity Removed Job Code
			this.determineQuantityRJC();

			//Determine Why Made C
			this._determineWhyMadeCode();
		},

		handleChangeRemovedJobCodeRJC: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);

			if (oContext.RemovedJobCode) {
				//Get Removed Qualifier
				this._getRemovedQualifier(oContext.RemovedJobCode);

				//Determine Why Made Code
				this._determineWhyMadeCode();

				//Get Location by Removed Job Code
				this._getLocationByJobCode("/comboBoxValues/Location", oContext.RemovedJobCode);

				//Get Applied Job Code
				this._determineAppliedJobCodeRJC(true);

				//Determine Quantity Removed Job Code
				this.determineQuantityRJC();
			} else {
				this._oController.byId("idRepairWrongRepair").setEnabled(false);
				this._oController.byId("idRepairWhyMade08").setEnabled(false);
			}
		},

		handleChangeMaterialNumber: function () {
			var sPath;
			var oMaterial;
			var aRule;
			var bIsMismatch;
			var sReplaceCondCode;
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);

			sPath = this._oController.getModel().createKey(this._sMaterialNumberSearch, {
				jobcode: oContext.AppliedJobCode,
				matnr: oContext.MaterialNumber
			});
			oMaterial = this._oController.getModel().getProperty(sPath);

			//Populate Description
			if (!oMaterial) {
				return;
			}

			oContext.MaterialDescription = oMaterial.maktx;
			//Check against Rule in Material Condition Code
			aRule = this._oController.getModel("RepairConfig").getProperty("/MaterialConditionCode");
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oContext.MaterialNumber, aRule[i].MaterialCodeCheck, parseInt(aRule[i].MaterialCode, 10))) {
					if (oContext.ConditionCode !== aRule[i].ConditionCode) {
						sReplaceCondCode = aRule[i].ConditionCode;
						bIsMismatch = true;
					}
					break;
				}
			}

			if (bIsMismatch) {
				var bCompact = !!this._oController.getView().$().closest(".sapUiSizeCompact").length;
				MessageBox.error(
					this._oController.getResourceBundle().getText("conditionCodeMismatch", [aRule[i].ConditionCode, oContext.ConditionCode]), {
						actions: [this._oController.getResourceBundle().getText("overwriteConditionCode"), this._oController.getResourceBundle().getText(
							"reselectMaterial")],
						styleClass: bCompact ? "sapUiSizeCompact" : "",
						onClose: function (sAction) {
							if (sAction === this._oController.getResourceBundle().getText("overwriteConditionCode")) {
								oContext.ConditionCode = sReplaceCondCode;
							} else if (sAction === this._oController.getResourceBundle().getText(
									"reselectMaterial")) {
								oContext.MaterialNumber = "";
								oContext.MaterialDescription = "";
							}
							this._oController.getModel("WOModel").updateBindings(true);
						}.bind(this)
					}
				);
			}
		},

		handleChangeMaterialNumberMAT: function () {
			var sPath = "/ZMPM_CDS_CAR_JOBCD_MAT";
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var aFilter;
			var aJobCode = [];

			aFilter = [new sap.ui.model.Filter({
				path: "matnr",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: oContext.MaterialNumber
			})];
			this._oController.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						//Populate first description is enough as they are all the same regardless job code combination
						if (i === 0) {
							oContext.MaterialDescription = oData.results[i].maktx;
						}
						aJobCode.push(oData.results[i].jobcode);
					}

					aFilter = [];
					aFilter = [new sap.ui.model.Filter({
							path: "EffectiveDate",
							operator: sap.ui.model.FilterOperator.LE,
							value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "ExpirationDate",
							operator: sap.ui.model.FilterOperator.GE,
							value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "AppliedRemovedIndicator",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: "B",
							and: true
						})
					];
					for (i = 0; i < aJobCode.length; i++) {
						aFilter.push(
							new sap.ui.model.Filter({
								path: "JobCode",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: aJobCode[i],
								and: true
							})
						);
					}

					this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode").then(function (sStatus) {
						if (sStatus === "Completed") {
							if (aJobCode.length === 1) {
								oContext.AppliedJobCode = aJobCode[0];
								this.handleChangeAppliedJobCodeMAT();
							}
						}
						this._oController.getModel("WOModel").updateBindings(true);
					}.bind(this));
				}.bind(this),
				error: function (sMsg) {

				}
			});
			
			//Determine Material Condition Code
			this._determineMaterialConditionCode(oContext.MaterialNumber);

		},

		handleMaterialCalculator: function (sContextPath) {
			var oModel = this._createMaterialCalculatorModel();
			var sAppliedJobCode = this._oController.getModel("WOModel").getProperty(sContextPath).AppliedJobCode;
			var sPath = "/ZMPM_CDS_CAR_MATCALC_AJC('" + sAppliedJobCode + "')";
			var aDiameter = [];
			var aWidth = [];
			var aThickness = [];
			var oItem;

			this._oController.getModel().read(sPath, {
				urlParameters: {
					"$expand": "to_materialWeight,to_materialCalcRule"
				},
				success: function (oData) {
					oModel.setProperty("/title", oData.MaterialDescription);
					for (var i = 0; i < oData.to_materialWeight.results.length; i++) {
						oItem = {};
						oItem.key = oData.to_materialWeight.results[i].DiameterInch;
						aDiameter.push(oItem);

						oItem = {};
						oItem.key = oData.to_materialWeight.results[i].WidthInch;
						aWidth.push(oItem);

						oItem = {};
						oItem.key = oData.to_materialWeight.results[i].ThicknessInch;
						aThickness.push(oItem);
					}
					oModel.setProperty("/comboBoxValues/Diameter", aDiameter);
					oModel.setProperty("/comboBoxValues/Width", aWidth);
					oModel.setProperty("/comboBoxValues/Thickness", aThickness);

					oModel.setProperty("/fieldProperty/DiameterEnable", oData.to_materialCalcRule.DiameterEnable);
					oModel.setProperty("/fieldProperty/WidthEnable", oData.to_materialCalcRule.WidthEnable);
					oModel.setProperty("/fieldProperty/ThicknessEnable", oData.to_materialCalcRule.ThicknessEnable);

					this._oController.getModel("MaterialCalculatorModel").setProperty("/", oModel.getProperty("/"));
					this._oController.getModel("MaterialCalculatorModel").updateBindings(true);

					this._aMaterialCalculatorResults = oData;
					sap.ui.core.BusyIndicator.hide();
				}.bind(this),
				error: function (sMsg) {
					sap.ui.core.BusyIndicator.hide();
				}.bind(this)
			});
		},

		handleMaterialCalculatorCalculate: function (sContextPath, oDialog) {
			var aProperty = [];
			var sValue;
			var sValueCheck;
			var sWeight;
			var oContext = this._oController.getModel("WOModel").getProperty(sContextPath);

			if (this._aMaterialCalculatorResults.to_materialCalcRule.DiameterEnable) {
				aProperty.push("DiameterInch");
			}
			if (this._aMaterialCalculatorResults.to_materialCalcRule.WidthEnable) {
				aProperty.push("WidthInch");
			}
			if (this._aMaterialCalculatorResults.to_materialCalcRule.ThicknessEnable) {
				aProperty.push("ThicknessInch");
			}

			for (var i = 0; i < this._aMaterialCalculatorResults.to_materialWeight.results.length; i++) {
				for (var x = 0; x < aProperty.length; x++) {
					sValue = this._oController.getModel("MaterialCalculatorModel").getProperty("/value")[aProperty[x]];
					sValueCheck = this._aMaterialCalculatorResults.to_materialWeight.results[i][aProperty[x]];
					if (sValue !== sValueCheck) {
						continue;
					}
					if (x === aProperty.length - 1) {
						sWeight = this._aMaterialCalculatorResults.to_materialWeight.results[i].WeightLbs;
					}
				}
			}

			oContext.Quantity = Math.round(sWeight * this._oController.getModel("MaterialCalculatorModel").getProperty("/value").LinearFoot);
			this._oController.getModel("WOModel").updateBindings(true);

			oDialog.close();
		},

		handleChangeWrongRepair: function (bSelected) {
			if (bSelected) {
				if (this._sRepairType === "AJC") {
					this._getRemovedJobCode("RJC");
				} else if (this._sRepairType === "RJC") {
					this._determineAppliedJobCodeRJC(false);
				}
			} else {
				if (this._sRepairType === "AJC") {
					this._getRemovedJobCode("AJC");
				} else if (this._sRepairType === "RJC") {
					this._determineAppliedJobCodeRJC(true);
				}
				this._oController.byId("idRepairWhyMade08").setEnabled(false);
			}

			//Refresh why made code
			this._determineWhyMadeCode();
		},

		handleChangeWhyMade08: function (bSelected, sContextPath) {
			if (bSelected) {
				this._oController.byId("idRepairWhyMadeCode").setValue("08");
				this._oController.byId("idRepairWrongRepair").setSelected(false);
			} else {
				this._oController.byId("idRepairWhyMadeCode").setValue("");
				this._determineWhyMadeCode();
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

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
			var aRule = this._oController.getModel("RepairConfig").getProperty("/AppliedQualifier");
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
						this._oController.byId("idRepairAQ").setValue("");
						this._oController.byId("idRepairAQ").setEnabled(true);

						this._sAppliedQualifierSearchTable = "/" + aRule[i].SearchTable;
						this._getAppliedQualifier(aRule[i].SearchTable, "/comboBoxValues/AppliedQualifier", aFilter, aRule[i].SearchExclusion);
					} else {
						this._oController.byId("idRepairAQ").setEnabled(false);
						this._oController.byId("idRepairAQ").setValue("");
					}

					break;
				}
			}
		},

		_determineDescription: function (sAppliedJobCode, sAppliedQualifier) {
			var aRule = this._oController.getModel("RepairConfig").getProperty("/Description");
			var sPath;
			var oAppliedQualifier = {};
			var oAppliedJobCode = {};

			//Get Applied Qualifier context
			if (this._sAppliedQualifierSearchTable) {
				sPath = this._oController.getModel().createKey(this._sAppliedQualifierSearchTable, {
					JobCode: sAppliedJobCode,
					QualifierCode: sAppliedQualifier
				});
				oAppliedQualifier = this._oController.getModel().getProperty(sPath);
			}

			//Get Applied Job Code context
			sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
				JobCode: sAppliedJobCode
			});
			oAppliedJobCode = this._oController.getModel().getProperty(sPath);

			//Reset default property of Description field
			this._oController.byId("idRepairDescription").setValue("");
			this._oController.byId("idRepairDescription").setEditable(false);

			//Check against Rule in Description
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sAppliedJobCode, aRule[i].AppliedJobCodeCheck, parseInt(aRule[i].AppliedJobCode, 10))) {
					if (aRule[i].CarPartCheck === "" && aRule[i].CarPart === "") {
						this._checkPopulateDescriptionDefault(aRule[i].PopulateDefault, oAppliedQualifier, oAppliedJobCode);
						break;
					}

					if (oAppliedQualifier) {
						if (this._compareRule(oAppliedQualifier.CarPart, aRule[i].CarPartCheck, aRule[i].CarPart)) {
							this._checkPopulateDescriptionDefault(aRule[i].PopulateDefault, oAppliedQualifier, oAppliedJobCode);
						} else {
							break;
						}
					}
				}
			}
		},
		
		_determineMaterialConditionCode: function(sMaterialCode) {
			//Check against Rule in Description
			var aRule = this._oController.getModel("RepairConfig").getProperty("/MaterialConditionCode");
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sMaterialCode, aRule[i].MaterialCodeCheck, parseInt(aRule[i].MaterialCode, 10))) {
					oContext.ConditionCode = aRule[i].ConditionCode;
					this._oController.getModel("WOModel").updateBindings(true);
					break;
				}
			}
		},

		_initScreenValues: function () {
			this._getResponsibilityCode("/comboBoxValues/ResponsibilityCode");

			if (this._sRepairType === "AJC") {
				this._getAppliedJobCode();
			} else if (this._sRepairType === "RJC") {
				this._getRemovedJobCode("RJC");
			} else if (this._sRepairType === "MAT") {
				this._getMaterialNumber("ZMPM_CDS_CAR_JOBCD_MAT", "/comboBoxValues/MaterialNumber");
				this._getMaterialCondCode(null, "/comboBoxValues/ConditionCode");
			}
		},

		_checkPopulateDescriptionDefault: function (sPopulateDefault, oAppliedQualifier, oAppliedJobCode) {
			switch (sPopulateDefault) {
			case "A":
				//Car Part Code Description In Applied Qualifier
				this._oController.byId("idRepairDescription").setEditable(false);
				this._oController.byId("idRepairDescription").setValue(oAppliedQualifier.CarPartDescription);
				break;
			case "B":
				//Job Code Description of AJC
				this._oController.byId("idRepairDescription").setEditable(false);
				this._oController.byId("idRepairDescription").setValue(oAppliedJobCode.JobCodeDescription);
				break;
			case "ML":
				//Manual
				this._oController.byId("idRepairDescription").setValue("");
				this._oController.byId("idRepairDescription").setEditable(true);
				break;
			default:
				break;
			}
		},

		_createMaterialCalculatorModel: function () {
			return new JSONModel({
				title: "",
				comboBoxValues: {
					Diameter: [],
					Width: [],
					Thickness: []
				},
				fieldProperty: {
					DiameterEnable: false,
					WidthEnable: false,
					ThicknessEnable: false
				},
				value: {
					DiameterInch: "",
					WidthInch: "",
					ThicknessInch: "",
					LinearFoot: ""
				}
			});
		},

		_determineAppliedJobCodeRJC: function (bMandatory) {
			var aFilter;
			var sPath;
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oRemovedJobCode;

			if (bMandatory) {
				//Get Removed Job Code context
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.RemovedJobCode
				});
				oRemovedJobCode = this._oController.getModel().getProperty(sPath);

				aFilter = [new sap.ui.model.Filter({
						path: "RemovedJobCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.RemovedJobCode,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "PriceMasterID",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oRemovedJobCode.PriceMasterID,
						and: true
					})
				];
				this._getJobCodeCouplet(aFilter, "/comboBoxValues/AppliedJobCode", true).then(function (aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this._oController.byId("idRepairRJC").setValue(aItems[0].key);
					}
				}.bind(this));
			} else {
				this._getAppliedJobCode();
			}
		},

		_determineConditionCode: function (oContext) {
			var aFilter;
			var sPath;
			var oAppliedJobCode;

			if (this._sRepairType === "AJC") {
				aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: oContext.AppliedJobCode,
					and: true
				})];

				this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter);
			} else if (this._sRepairType === "RJC") {
				//Get Applied Job Code context
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.AppliedJobCode
				});
				oAppliedJobCode = this._oController.getModel().getProperty(sPath);

				aFilter = [new sap.ui.model.Filter({
						path: "RemovedJobCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.RemovedJobCode,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "AppliedJobCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.AppliedJobCode,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "WhyMadeCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.WhyMadeCode,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "ResponsibilityCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.ResponsibilityCode,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "PriceMasterID",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oAppliedJobCode.PriceMasterID,
						and: true
					})
				];

				this._getJobCodePrice(aFilter, "/comboBoxValues/ConditionCode", null, true).then(function (aItems) {
					if (aItems.length === "1") {
						this._oController.byId("idRepairCondCode").setValue(aItems[0].key);
					}
				}.bind(this));
			}
		},

		_determineMaterialNumber: function (sAppliedJobCode, sConditionCode) {
			//Check against Rule in Description
			var aRule = this._oController.getModel("RepairConfig").getProperty("/MaterialNumber");
			var aFilter;

			this._oController.byId("idRepairMaterial").setShowValueHelp(true);
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sAppliedJobCode, aRule[i].AppliedJobCodeCheck, parseInt(aRule[i].AppliedJobCode, 10))) {
					if (aRule[i].ConditionCodeCheck === "" || aRule[i].ConditionCode === "") {
						if (aRule[i].MaterialNumRequired) {
							this._oController.byId("idRepairMaterial").setValue("");
							this._oController.byId("idRepairMaterial").setShowValueHelp(false);
							this._oController.byId("idRepairMaterial").setRequired(true);
						}
						if (aRule[i].MaterialCostRequired) {

							this._oController.byId("idRepairMaterialCost").setValue("");
							this._oController.byId("idRepairMaterialCost").setRequired(true);
						}
						break;
					}

					if (this._compareRule(sConditionCode, aRule[i].ConditionCodeCheck, aRule[i].ConditionCode)) {

						if (aRule[i].SearchTable === "") {
							this._oController.getModel("RepairsModel").setProperty("/comboBoxValues/MaterialNumber", []);
						} else {
							aFilter = [new sap.ui.model.Filter({
								path: "jobcode",
								operator: sap.ui.model.FilterOperator.EQ,
								value1: sAppliedJobCode,
								and: true
							})];
							this._getMaterialNumber(aRule[i].SearchTable, "/comboBoxValues/MaterialNumber", aFilter).then(function (aItems) {
								if (aItems.length > "0") {
									this._oController.byId("idRepairMaterialCalculator").setEnabled(true);
								} else if (aItems.length === 0) {
									this._oController.byId("idRepairMaterialCalculator").setEnabled(false);
								}
							}.bind(this));
							break;
						}
					}
				}
			}
		},

		_determineWhyMadeCode: function () {
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);
			var oAppliedJobCode;
			var oRemovedJobCode;
			var aFilter;
			var sPath;

			if (oContext.WrongRepair) {
				//Check if Why Made Code 08 exist for 
				this._getWhyMadeCodeWR(oContext.AppliedJobCode, "/comboBoxValues/WhyMadeCode").then(function (bWhyMade08Exist) {
					if (bWhyMade08Exist) {
						this._oController.byId("idRepairWhyMade08").setEnabled(true);
						//Temporary commented
						// aFilter = [new sap.ui.model.Filter({
						// 	path: "JobCode",
						// 	operator: sap.ui.model.FilterOperator.EQ,
						// 	value1: oContext.AppliedJobCode,
						// 	and: true
						// }), new sap.ui.model.Filter({
						// 	path: "WhyMadeCode",
						// 	operator: sap.ui.model.FilterOperator.EQ,
						// 	value1: "08",
						// 	and: true
						// })];
						// this._validateJobCodeWhyMadeCode(aFilter).then(function (oData) {
						// 	if (oData) {
						// 		if(oData.results[0].JobCode === oContext.AppliedJobCode) {

						// 		}
						// 	}
						// });
					}
				}.bind(this));
			} else {
				if (this._sRepairType === "AJC") {
					//All must filled
					if (oContext.AppliedJobCode === undefined || oContext.RemovedJobCode === undefined || oContext.ResponsibilityCode === undefined ||
						oContext.AppliedJobCode === "" ||
						oContext.RemovedJobCode === "" || oContext.ResponsibilityCode === "" || oContext.ConditionCode === undefined ||
						oContext.ConditionCode === "") {
						return;
					}

					//Get Applied Job Code context
					sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: oContext.AppliedJobCode
					});
					oAppliedJobCode = this._oController.getModel().getProperty(sPath);

					aFilter = [new sap.ui.model.Filter({
							path: "AppliedJobCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oContext.AppliedJobCode,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "RemovedJobCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oContext.RemovedJobCode,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "ResponsibilityCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oContext.ResponsibilityCode,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "PriceMasterID",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oAppliedJobCode.PriceMasterID,
							and: true
						})
					];
				} else if (this._sRepairType === "RJC") {
					//All must filled
					if (oContext.RemovedJobCode === undefined || oContext.ResponsibilityCode === undefined ||
						oContext.RemovedJobCode === "" || oContext.ResponsibilityCode === "") {
						return;
					}

					//Get Removed Job Code context
					sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
						JobCode: oContext.RemovedJobCode
					});
					oRemovedJobCode = this._oController.getModel().getProperty(sPath);

					aFilter = [
						new sap.ui.model.Filter({
							path: "RemovedJobCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oContext.RemovedJobCode,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "ResponsibilityCode",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oContext.ResponsibilityCode,
							and: true
						}),
						new sap.ui.model.Filter({
							path: "PriceMasterID",
							operator: sap.ui.model.FilterOperator.EQ,
							value1: oRemovedJobCode.PriceMasterID,
							and: true
						})
					];
				}
				this._getJobCodePrice(aFilter, "/comboBoxValues/WhyMadeCode", true, null).then(function (aItems) {
					if (aItems.length === "1") {
						this._oController.byId("idRepairWhyMadeCode").setValue(aItems[0].key);
					}
				}.bind(this));
			}
		},

		_determineMaterialCost: function (sAppliedJobCode) {
			//Check against Rule in Description
			var aRule = this._oController.getModel("RepairConfig").getProperty("/MaterialCost");

			this._oController.byId("idRepairMaterialCost").setEnabled(true);
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(sAppliedJobCode, aRule[i].AppliedJobCodeCheck, parseInt(aRule[i].AppliedJobCode, 10))) {
					this._oController.byId("idRepairMaterialCost").setEnabled(aRule[i].EnableFlag);
				}
			}
		},

		_getAppliedQualifier: function (sCDS, sProperty, aFilter, sExclusion) {
			var sPath = "/" + sCDS;
			var aComboBoxItem = [];
			var oComboBoxItem;
			var sFilter;

			if (sExclusion) {
				sFilter = "not startswith(CarPart,'" + sExclusion + "')"; //Temporary expecting 1 exclusion only

				this._oController.getModel().read(sPath, {
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
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			} else {
				this._oController.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].QualifierCode;
							oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
							aComboBoxItem.push(oComboBoxItem);
						}
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			}
		},

		_getMaterialNumber: function (sCDS, sProperty, aFilter) {
			var sPath = "/" + sCDS;
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
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
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			}.bind(this));
		},

		_getRemovedQualifier: function (sRemovedJobCode) {
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
			this._oController.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].QualifierCode;
						oComboBoxItem.text = oData.results[i].ManufacturerDesignation;
						aComboBoxItem.push(oComboBoxItem);
					}
					this._oController.getModel("RepairsModel").setProperty("/comboBoxValues/RemovedQualifier", aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_getResponsibilityCode: function (sProperty) {
			var sPath = "/ZMPM_CDS_CAR_RESPCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;
			var bSetDefault;

			this._oController.getModel().read(sPath, {
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].ResponseCodeID;
						oComboBoxItem.text = oData.results[i].ResponseCodeDesc;
						aComboBoxItem.push(oComboBoxItem);

						//Check and set default
						if ((this._sRepairType === "AJC" && oData.results[i].AppliedJobCodeDefault === true) || (this._sRepairType === "RJC" && oData
								.results[i].RemovedjobCodeDefault === true) || (this._sRepairType === "MAT" && oData
								.results[i].MaterialDefault === true)) {
							bSetDefault = true;
						}
						if (bSetDefault) {
							this._oController.byId("idRepairRespCode").setValue(oData.results[i].ResponseCodeID);
							bSetDefault = false;
						}
					}
					this._aResponsibilityCodeResults = oData.results;
					this._aResponsibilityCode = aComboBoxItem;
					this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_getAppliedJobCode: function () {
			var aFilter = [new sap.ui.model.Filter({
					path: "EffectiveDate",
					operator: sap.ui.model.FilterOperator.LE,
					value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ExpirationDate",
					operator: sap.ui.model.FilterOperator.GE,
					value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "AppliedRemovedIndicator",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: "B",
					and: true
				})
			];
			this._getJobCode(aFilter, "/comboBoxValues/AppliedJobCode");
		},

		_getRemovedJobCode: function (sType) {
			var aFilter;
			var sPath;
			var oAppliedJobCode;
			var oContext = this._oController.getModel("WOModel").getProperty(this._sContextPath);

			if (sType === "AJC") {
				//Get Applied Job Code context
				sPath = this._oController.getModel().createKey("/ZMPM_CDS_CAR_REPAIR_JOBCODE", {
					JobCode: oContext.AppliedJobCode
				});
				oAppliedJobCode = this._oController.getModel().getProperty(sPath);

				aFilter = [new sap.ui.model.Filter({
						path: "JobCode",
						operator: sap.ui.model.FilterOperator.EQ,
						value1: oContext.AppliedJobCode,
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
						this._oController.byId("idRepairRJC").setValue(aItems[0].key);
					}
				}.bind(this));
			} else if (sType === "RJC") {
				aFilter = [new sap.ui.model.Filter({
						path: "EffectiveDate",
						operator: sap.ui.model.FilterOperator.LE,
						value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "ExpirationDate",
						operator: sap.ui.model.FilterOperator.GE,
						value1: this._oController.getModel("WOModel").getProperty("/WOHeader").CreatedDateTime,
						and: true
					}),
					new sap.ui.model.Filter({
						path: "AppliedRemovedIndicator",
						operator: sap.ui.model.FilterOperator.NE,
						value1: "N",
						and: true
					})
				];
				this._getJobCode(aFilter, "/comboBoxValues/RemovedJobCode");
			}
		},

		_getJobCode: function (aFilter, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_REPAIR_JOBCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
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
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve("Completed");
					}.bind(this),
					error: function (sMsg) {
						resolve("Error");
					}
				});
			}.bind(this));
		},

		_getConditionCode: function (sPath, sProperty, aFilter) {
			var aComboBoxItem = [];
			var oComboBoxItem;

			this._oController.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].ConditionCode;
						oComboBoxItem.text = oData.results[i].ConditionCodeDescription;
						aComboBoxItem.push(oComboBoxItem);
					}
					this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_getLocationByJobCode: function (sProperty, sJobCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODECARLOC";
			var aComboBoxItem = [];
			var oComboBoxItem;

			var sCarKind = this._oController.getModel("WOModel").getProperty("/CarKind");

			var aFilter = [new sap.ui.model.Filter({
					path: "JobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sJobCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "CarKind",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sCarKind,
					and: true
				})
			];

			this._oController.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].CarLocationID;
						oComboBoxItem.text = oData.results[i].CarLocationDescription;
						aComboBoxItem.push(oComboBoxItem);
					}

					this._aLocationResults = oData.results;
					this._aLocation = aComboBoxItem;
					this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_getWhyMadeCode: function (sAppliedJobCode, sRemovedJobCode, sResponsibilityCode, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODEPRICE";
			var aComboBoxItem = [];
			var oComboBoxItem;

			var aFilter = [new sap.ui.model.Filter({
					path: "AppliedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sAppliedJobCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "RemovedJobCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sRemovedJobCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "ResponsibilityCode",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: sResponsibilityCode,
					and: true
				}),
				new sap.ui.model.Filter({
					path: "PriceMasterID",
					operator: sap.ui.model.FilterOperator.EQ,
					value1: this._oController.getModel().getProperty("/ZMPM_CDS_CAR_REPAIR_APPLJC('" + sAppliedJobCode + "')").PriceMasterID,
					and: true
				})
			];

			this._oController.getModel().read(sPath, {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].WhyMadeCode;
						oComboBoxItem.text = oData.results[i].WhyMadeCodeDescription;
						aComboBoxItem.push(oComboBoxItem);
					}

					//Set default if only one record
					if (oData.results.length === 1) {
						this._oController.byId("idRepairWhyMadeCode").setValue(oData.results[0].WhyMadeCode);
					}

					this._aWhyMadeCodeResults = oData.results;
					this._aWhyMadeCode = aComboBoxItem;
					this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});
		},

		_getWhyMadeCodeWR: function (sAppliedJobCode, sProperty) {
			var sPath = "/ZMPM_CDS_CAR_WRONGREPAIRWHYMD";
			var aComboBoxItem = [];
			var oComboBoxItem;
			var bWhyMade08Exist = false;

			var aFilter = [new sap.ui.model.Filter({
				path: "JobCode",
				operator: sap.ui.model.FilterOperator.EQ,
				value1: sAppliedJobCode
			})];

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						for (var i = 0; i < oData.results.length; i++) {
							oComboBoxItem = {};
							oComboBoxItem.key = oData.results[i].WhyMadeCode;
							oComboBoxItem.text = oData.results[i].WhyMadeCodeDescription;

							if (oData.results[i].WhyMadeCode === "08") {
								bWhyMade08Exist = true;
							}
							aComboBoxItem.push(oComboBoxItem);
						}

						//Set default if only one record
						if (oData.results.length === 1) {
							this._oController.byId("idRepairWhyMadeCode").setValue(oData.results[0].WhyMadeCode);
						}

						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);

						resolve(bWhyMade08Exist);
					}.bind(this),
					error: function (sMsg) {

					}.bind(this)
				});
			}.bind(this));
		},

		_getJobCodePrice: function (aFilter, sProperty, bWhyMadeCode, bConditionCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODEPRICE";
			var aComboBoxItem = [];
			var aWhyMadeCodeAdded = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
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
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {}.bind(this)
				});
			}.bind(this));
		},

		_getJobCodeCouplet: function (aFilter, sProperty, bAppliedJobCode) {
			var sPath = "/ZMPM_CDS_CAR_JOBCDCOUPLET";
			var aComboBoxItem = [];
			var oComboBoxItem;

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
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
						this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
						resolve(aComboBoxItem);
					}.bind(this),
					error: function (sMsg) {}.bind(this)
				});
			}.bind(this));
		},
		
		_getMaterialCondCode: function (aFilter, sProperty) {
			var aComboBoxItem = [];
			var oComboBoxItem;

			this._oController.getModel().read("/ZMPM_CDS_CAR_MATERIALCONDCD", {
				filters: aFilter,
				success: function (oData) {
					for (var i = 0; i < oData.results.length; i++) {
						oComboBoxItem = {};
						oComboBoxItem.key = oData.results[i].ConditionCode;
						oComboBoxItem.text = oData.results[i].ConditionCodeDescription;
						aComboBoxItem.push(oComboBoxItem);
					}
					this._oController.getModel("RepairsModel").setProperty(sProperty, aComboBoxItem);
				}.bind(this),
				error: function (sMsg) {

				}.bind(this)
			});			
		},

		_validateJobCodeWhyMadeCode: function (aFilter) {
			var sPath = "/ZMPM_CDS_CAR_JOBCODEWHYMDCD";

			return new Promise(function (resolve) {
				this._oController.getModel().read(sPath, {
					filters: aFilter,
					success: function (oData) {
						resolve(oData);
					}.bind(this),
					error: function (sMsg) {
						resolve(null);
					}.bind(this)
				});
			}.bind(this));
		}
	});
});