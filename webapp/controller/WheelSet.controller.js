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
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.WheelSet", {
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
		 * perform validation check upon a mandatory combo box field is changed
		 * @public
		 * @param {Object} oEvent - Event object from mandatory field
		 */
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

		/**
		 * to handle change of Applied Job Code
		 * @public
		 */
		onChangeAppliedJobCode: function () {
			var oContext = this.getModel("addCIDView").getProperty("/response");
			// var appliedJobCode = this.getView().byId("idRepairAJC").getSelectedKey();
			// var oJobCode = {};

			// Clear existing value for Material Quantity On Hand and Quantity Available
			this.getView().byId("idQuantityOnHand").setValue("");
			this.getView().byId("idQuantityAvailable").setValue("");

			if (oContext.WsAppliedJobCode === "") {
				this.getView().byId("idRepairAJC").setValue("");
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.Error);
				return;
			} else {
				this.getView().byId("idRepairAJC").setValueState(sap.ui.core.ValueState.None);
				this.byId("idRepairRJC").setSelectedKey("");
				this.byId("idRepairRJC").setValue("");
			}
			if (oContext.WsAppliedJobCode && oContext.WsAppliedJobCode !== "0000") {

				//Check Condition Code
				this._determineConditionCode();

				//Check Why Made Code
				this._determineWhyMadeCode();

				// //Determine Removed Job Code
				this._getRemovedJobCode();

				//Check Material Number Rule
				this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);
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
					// dialog for material
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
			case "idRepairMaterial":
				this.handleChangeMaterialNumber();
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
		 * to handle change of Material Number event
		 * @public
		 */
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

		/**
		 * to handle change of Removed Job Code event
		 * @public
		 */
		handleChangeRemovedJobCodeAJC: function () {
			//Determine Why Made Code
			this._determineWhyMadeCode();
		},

		/**
		 * to get View Element ID
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
				},

				quantityOnHand: "",
				quantityAvailable: ""

			});
		},

		/**
		 * to get screen values during initial load
		 * @private
		 */
		_initScreenValues: function () {
			// obtain initial value for Applied Job Code
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
			// var sPath = (sProperty === "/comboBoxValues/AppliedJobCode" ? "/ZMPM_CDS_CAR_APPLIEDJOBCODE" : "/ZMPM_CDS_CAR_REMOVEDJOBCODE");
			var sPath = "/ZMPM_CDS_CAR_REPAIR_JOBCODE";
			var aComboBoxItem = [];
			var oComboBoxItem;
			// var aJobCodes = [];
			// var sPriceMasterID = this.getModel("WOModel").getProperty("/WOHeader/PriceMasterID");

			return new Promise(function (resolve) {
				this.getModel().read(sPath, {
					urlParameters: {
						"$orderby": "JobCode"
					},
					filters: aFilter,
					success: function (oData) {
						var sAppliedRemovedIndicator = (sProperty === "/comboBoxValues/AppliedJobCode" ? "B" : "N");
						var sPriceMasterID = this.getModel("addCIDView").getProperty("/cidHeader/priceMasterId");
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

			if (oContext.WsAppliedJobCode === "") {
				return;
			}
		
			if (this._compareRule(oContext.WsAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
					path: "JobCode",
					operator: FilterOperator.EQ,
					value1: oContext.WsAppliedJobCode,
					and: true
				})];

				this._getConditionCode("/ZMPM_CDS_CAR_JOBCODECOND", "/comboBoxValues/ConditionCode", aFilter);
			} else {
				this._getConditionCode("/ZMPM_CDS_CAR_CONDITIONCODE", "/comboBoxValues/ConditionCode", []);
			}
			// }
		},

		/** 
		 * Method to get Condition Code
		 * @constructor 
		 * @param {String} sPath - The path(CDS) to be read
		 * @param {String} sProperty - The property to be binded in the model
		 * @param {Array} aFilter - The array of filter criterias
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

			// if (oContext.AppliedJobCode < 1000) {
			// 	aFilter = [new Filter({
			// 		path: "AppliedJobCode",
			// 		operator: FilterOperator.EQ,
			// 		value1: oContext.WsAppliedJobCode,
			// 		and: true
			// 	})];
			// } else {

			//All must filled
			if (oContext.WsAppliedJobCode === undefined || oContext.WsRemovedJobCode === undefined || responsibilityCode === undefined ||
				oContext.WsAppliedJobCode === "" || oContext.WsRemovedJobCode === "" || responsibilityCode === "") {
				return;
			}

			if (this._compareRule(oContext.WsAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
						path: "AppliedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WsAppliedJobCode,
						and: true
					}),
					new Filter({
						path: "RemovedJobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WsRemovedJobCode,
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
					// this._oController.getModel("WOModel").updateBindings(true);
				}
			}.bind(this));
			// }
		},

		/**
		 * to determine material quantity for Quantity on Hand and Quantity Available
		 * @private
		 */
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
					var oViewModel = this.getModel("RepairsModel");
					oViewModel.setProperty("/quantityOnHand", oRepairLine.QuantityOnHand);
					oViewModel.setProperty("/quantityAvailable", oRepairLine.QuantityAvailable);
				}.bind(this),
				error: function () {
					oRepairLine.MaterialNotFound = true;
				}
			});
		},

		/**
		 * to get Removed Job Code value
		 * @private
		 */
		_getRemovedJobCode: function () {
			var aFilter;
			var oContext = this.getModel("addCIDView").getProperty("/response");

			//Check AJC whether it is end with 99
			if (this._compareRule(oContext.WsAppliedJobCode, "NEW", "99")) {
				aFilter = [new Filter({
						path: "JobCode",
						operator: FilterOperator.EQ,
						value1: oContext.WsAppliedJobCode,
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
					this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);
					// this.handleChangeRemovedJobCodeAJC();
					// this._oController.getModel("WOModel").updateBindings(true);
				}.bind(this));
			} else {
				// //Removed Job Code must equal AJC that ends with 99
				// aFilter = [new Filter({
				// 	path: "JobCode",
				// 	operator: FilterOperator.EQ,
				// 	value1: oContext.WsAppliedJobCode,
				// 	and: true
				// })];

				this._getJobCode(aFilter, "/comboBoxValues/RemovedJobCode").then(function (aItems) {
					if (aItems.length === 1) {
						//If only 1 Item, set default
						this.byId("idRepairRJC").setSelectedKey(aItems[0].key);
					}
					this._determineConditionCode();
					this._determineWhyMadeCode();
					this._determineMaterialNumber(oContext.WsAppliedJobCode, oContext.WsConditionCode);
				}.bind(this));
			}
			// }
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
		 * Method to get Job Code from Price Master for Why Made Code/Condition Code
		 * @private
		 * @param {String} aFilter- Array of filter criterias
		 * @param {String} sProperty - Property to be binded in the model
		 * @param {Boolean} bWhyMadeCode - Indicator whether it is for Why Made Code
		 * @param {Boolean} bConditionCode - Indicator whether it is for Condition Code
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
		 * to determine material number for corresponding Applied Job Code
		 * @private
		 * @param {String} sAppliedJobCode - Applied Job
		 * @param {String} sConditionCode - Condition Code
		 */
		_determineMaterialNumber: function (sAppliedJobCode, sConditionCode) {
			//Check against Rule in Description
			var aRule = this.getModel("RepairConfig").getProperty("/MaterialNumber");

			if (sAppliedJobCode === "" || sConditionCode === "" || sConditionCode === undefined ) {
				return;
			}

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

		/** 
		 * to query material from CDS based on Applied Job Code
		 * @private
		 * @param {String} sCDS - CDS name
		 * @param {String} sProperty - Field Property 
		 * @param {String} sAppliedJobCode - Applied Job Code
		 * @returns {Object} Promise - Material context
		 */
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
						//clear value if not material number found
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

		/** 
		 * to get material reservation context
		 * @private
		 * @param {Object} oRepairLine - Repair Line Context
		 * @returns {Object} Promise - Material context
		 */
		_getMaterialReservationContext: function (oRepairLine) {
			var sBadOrderStatus = this.getModel("WOModel").getProperty("/WOHeader/BadOrderStatus"),
				aRule = this.getModel("RepairConfig").getProperty("/MaterialReservation"),
				oWheelSet = this.getModel("addCIDView").getProperty("/response"),
				oContext = {};

			//Start of code change made for PM00001432 - 6000008188, EAM CAR - Plant C237 required 8001SLOC f
			// Determine Material context for Sloc, Special Stock and Vendor Number
			for (var i = 0; i < aRule.length; i++) {
				if (this._compareRule(oWheelSet.WsConditionCode, aRule[i].ConditionCodeCheck, aRule[i].ConditionCode)) {
					oContext.StorageLocation = this.getModel("WOModel").getProperty("/WheelsetsLocation");
					oContext.SpecialStock = aRule[i].SpecialStock;
					oContext.VendorNumber = aRule[i].Vendor;
					//if(this.getModel("WOModel").getProperty("/StorLocIndicator") !== "X" || sBadOrderStatus !== "CR03"){
					//	break;
					//}
					break;
				} else {
					//If program order, use Program Location; otherwise Repair Location
					if (sBadOrderStatus === "CR03") {
						oContext.StorageLocation = this.getModel("WOModel").getProperty("/ProgramLocation");
					} else {
						oContext.StorageLocation = this.getModel("WOModel").getProperty("/RepairsLocation");
					}
				}
				
			/*	if(this.getModel("WOModel").getProperty("/StorLocIndicator") === "X"){
					if(sBadOrderStatus === "CR03" && oContext.StorageLocation === "8000"){
						oContext.StorageLocation = "8001"; 
						break;
					}
				}*/
				//End of code change made for PM00001432 - 6000008188, EAM CAR - Plant C237 required 8001SLOC f
			}
			return oContext;
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
				} else if (this._sRepairType === "RJC") {
					oJobCode = this._getRepairJobCodeCoupletRJC(sJobCode, sCDS);
				} else if (this._sRepairType === "MAT") {
					oJobCode = this._getRepairJobCodeCoupletMAT(sJobCode, sCDS);
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
					}.bind(this),
					error: function () {
						// this.getView().byId("idRepairWhyMadeCode").setBusy(false);
					}.bind(this)
				});
			}.bind(this));
		}
	});
});