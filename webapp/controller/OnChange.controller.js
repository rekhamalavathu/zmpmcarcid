sap.ui.define([
	"com/nscorp/car/common/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessagePopover",
	"sap/m/Link",
	"sap/m/MessageBox"
], function (BaseController, JSONModel, MessagePopover, Link, MessageBox) {
	"use strict";
	com.nscorp.car.common.controller.BaseController.extend("com.nscorp.car.componentid.controller.OnChange", {

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

		onChangeMandatoryInput: function (oEvent) {
			var oInput = oEvent.getParameter("newValue");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);
			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
			}

		},

		onChangeMonth: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput !== "") {
				if (oInput < 1 || oInput > 12) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}

		},

		onChangeYear: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput !== "") {
				if (oInput > 99) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		onChangeScale: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput !== "") {
				if (oInput < 16 || oInput > 50) {
					oInputControl.setValueState(sap.ui.core.ValueState.Error);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

				} else {
					oInputControl.setValueState(sap.ui.core.ValueState.None);
					this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
				}
			}
		},

		onChangeMandatoryMonth: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				if (oInput !== "") {
					if (oInput < 1 || oInput > 12) {
						oInputControl.setValueState(sap.ui.core.ValueState.Error);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

					} else {
						oInputControl.setValueState(sap.ui.core.ValueState.None);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
					}
				}
			}
		},

		onChangeMandatoryYear: function (oEvent) {
			var oInput = oEvent.getParameter("value");
			var oInputControl = oEvent.getSource();

			if (oInput === "") {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				if (oInput !== "") {
					if (oInput > 99) {
						oInputControl.setValueState(sap.ui.core.ValueState.Error);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

					} else {
						oInputControl.setValueState(sap.ui.core.ValueState.None);
						this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
					}
				}
			}
		},

		onChangeComboBox: function (oEvent) {
			var oInputControl = oEvent.getSource();
			var key = oEvent.getSource().getSelectedItem();
			var newval = oEvent.getParameter("newValue");

			if (newval !== "" && key === null) {
				oInputControl.setValueState(sap.ui.core.ValueState.Error);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", false);

			} else {
				oInputControl.setValueState(sap.ui.core.ValueState.None);
				this.getModel("addCIDView").setProperty("/buttonSetEnable", true);
			}
		}


	});
});