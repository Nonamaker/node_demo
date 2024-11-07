$(document).on("keypress", 'form', function (e) {
    const code = e.keyCode || e.which;
    if (code == 13) {
        e.preventDefault();
        return false;
    }
});

function addClass(element: HTMLElement, _class: string) {
    if (!element.classList.contains(_class)) { element.classList.add(_class); }
}

function removeClass(element: HTMLElement, _class: string) {
    if (element.classList.contains(_class)) { element.classList.remove(_class); }
}

function toggleClass(element: HTMLElement, _class:string) {
	if (element.classList.contains(_class)) {
		element.classList.remove(_class);
	} else {
		element.classList.add(_class);
	}
}

function hide_template(table: HTMLTableElement) {
	// Hides the template row, disables all buttons and inputs
	let template: HTMLTableRowElement = document.getElementById(table.id + "_template")! as HTMLTableRowElement;
	// Iterate just in case there are multiple templates with the same ID present.
	while (template !== null) {
		template.setAttribute("hidden", "hidden");
		template.setAttribute('id', table.id + "_template_resolved")
		for (let i = 0; i < template.cells.length; i++) {
			const col = template.cells[i];
			// Update selects
			const selects = col.getElementsByTagName("select");
			for (let j = 0; j < selects.length; j++) {
				addClass(selects[j], "no-validate");
				selects[j].disabled = true;
			}
			// Update inputs
			const inputs = col.getElementsByTagName("input");
			for (let j = 0; j < inputs.length; j++) {
				addClass(inputs[j], "no-validate");
				inputs[j].disabled = true;
			}
			// Update buttons
			const buttons = col.getElementsByTagName("button");
			for (let j = 0; j < buttons.length; j++) {
				buttons[j].disabled = true;
			}
			// Update textareas
			const textareas = col.getElementsByTagName("textarea");
			for (let j = 0; j < textareas.length; j++) {
				textareas[j].disabled = true;
				textareas[j].value = ""; // Null textareas are not submitted
			}
		}
		template = document.getElementById(table.id + "_template")! as HTMLTableRowElement;
	}
}

function hide_table_templates(){
	// Prepare all dynamic-form tables
	const tables = document.getElementsByTagName("table");
	for (let i = 0; i < tables.length; i++) {
		const table = tables[i];
		if (table.classList.contains("dynamic-form")) {
			hide_template(table);
		}
	}
}

function prepopulate() {
    /* Automatically fills inputs based on values in the URI.
    Dynamic rows are automatically added as needed. */
    const params: URLSearchParams = new URLSearchParams(window.location.search);
    // The table and its child inputs share a common base name like:
    //   table name = "something_table"
    //   input names = "something_1"
    // Get an array of table base names (without the _table suffix)
    let table_base_names: string[] = [];
    let table_list: HTMLCollectionOf<HTMLTableElement> = document.getElementsByTagName("table");
    for (const table of table_list) {
        // Extract the base name from the table names. Ignore table elements with names
        // not ending in '_table'.
        let table_name_elements: string[] = table.id.split('_');
        if (table_name_elements[table_name_elements.length - 1] === "table") {
            table_name_elements.splice(-1, 1);  // Remove "_table"
            table_base_names.push(table_name_elements.join('_'));
        }
    }
    for (const [key, value] of params) {
        const input_id: string = key;
        let input: HTMLInputElement = document.getElementById(input_id)! as HTMLInputElement;
        // If no input with the given name were found
        //  it may be necessary to add a dynamic row
        if (input === null) {
            for (const table_base_name of table_base_names) {
                if (input_id.startsWith(table_base_name)) {
                    // Convert input id to the equivalent template row input ID (replace # suffix with 0).
                    let input_id_elements: string[] = input_id.split("_");
                    input_id_elements[input_id_elements.length - 1] = "0";
                    let template_input_id: string = input_id_elements.join("_");
                    if (document.getElementById(template_input_id) !== null) {
                        // If it does match a dynamic row input ID, clone the template row.
                        while (document.getElementsByName(input_id).length === 0) {
                            append_table(table_base_name + "_table");
                        }
                    }
                }
            }
        }
        // Try again now that a dynamic row may have been added
        input = document.getElementById(input_id)! as HTMLInputElement;
        if (input !== null) {
            if (input.tagName === "TEXTAREA") {
                input.textContent = value;
            }
            else {  // Input, Select
                input.value = value;
            }
        }
    }
}


window.addEventListener("load", function(event) {
    hide_table_templates();
    prepopulate();
});


function find_lowest_unused_index(table) {
	/* Returns the lowest index not already in use by a row */
	var indices = [];
	var rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
	for (var i = 0; i < rows.length; i++) {
		// Index is the last element in the row ID
		var id_split = rows[i].id.split('_');
		var index = id_split[id_split.length-1];
		// Check if row is the template before coercing to a number
		if (index === "resolved") { index = 0; }
		else { index = parseInt(index); }
		indices.push(index);
	}
	var lowest_index = -1;
	for (var i = 0; i < indices.length; i++) {
		if (indices.indexOf(i) == -1) {
			lowest_index = i;
			break;
		}
	}
	if (lowest_index == -1) { // The list of indices has no gaps
		lowest_index = indices.length;
	}
	return lowest_index;
}

function create_new_indexed_string(existing, index) {
	/*
		Returns a new indexed string using the new index
		Index strings are in the format of some_variable_names_1
		where the index is the last element of the string and separated by an underscore
	*/
	var split = existing.split('_');
	split[split.length-1] = index;
	split = split.join('_');
	return split;
}

function create_row_from_template(template, index) {
	/*
	Creates a row from the template (a tr element) and updates inputs, buttons, etc. for use.
	The given index is used for updating element ids, names, etc
	Inputs:
		Are enabled;
		Names are updated with new index;
		Lists are updated with new id;
		No-validate class removed
	Buttons:
		Are enabled;
	Datalists:
		IDs are updated with new index;
	*/
	var clone = template.cloneNode(true);
	clone.removeAttribute('hidden'); // Reveal row
	clone = set_row_index(clone, index);
	return clone;
}


function update_event_hook_index(e, hooklist, index) {
    /*  Given an element <e> and a list of event hook names <hooklist>
        like ['onblur', 'onclick'], this function updates the content
        of the event with the new <index>.
        E.X. <input onclick="vsi(document.getElementsByName(`cathode_sid_1`)[0], `/salt/cathode/validate/`);>
        would be updated to
        <input onclick="vsi(document.getElementsByName(`cathode_sid_2`)[0], `/salt/cathode/validate/`);>
        if the 'onblur' event is specified in the <hooklist> and the new index is 2.
    */
    for (var i = 0; i < hooklist.length; i++) {
        //  Split the hook function, update anything that matches
		//  the some_text_# pattern, and update the # to the new index
		var hook = hooklist[i];
        var hook_content = e.getAttribute(hook);
        if (hook_content === null) {
            continue;
        }
        var indexed_parameters = hook_content.split('`');
        for (var x = 0; x < indexed_parameters.length; x++) {
            var parameter = indexed_parameters[x];
            var split = parameter.split('_');
            // If the last component of the name when split is a number, update it
            if (!isNaN(split[split.length-1])) {
                indexed_parameters[x] = create_new_indexed_string(parameter, index);
            }
        }
        // Rejoin
        var updated_string = indexed_parameters.join('`');
        e.setAttribute(hook, updated_string);
    }
}

function set_row_index(row, index) {
	// Generate new ID for row
	row.id = create_new_indexed_string(row.id, index);
	// Update individual cells
	for (var i = 0; i < row.cells.length; i++) {
		// Process template inputs and selects
		var elements = [];
		for (e of row.cells[i].getElementsByTagName("select")) {
		    elements.push(e);
		}
		for (e of row.cells[i].getElementsByTagName("input")) {
		    elements.push(e)
		}
		for (var j = 0; j < elements.length; j++) {
			// Update element name and id
			elements[j].name = create_new_indexed_string(elements[j].name, index);
			elements[j].setAttribute('id', elements[j].name); // They should always be the same
			removeClass(elements[j], "no-validate");  // TODO What is this doing?
			// Some elements should be disabled by default, so don't enable them!
			if (elements[j].classList.contains("dynamic-default-disabled")) {
			} else {
			    elements[j].disabled = false;
			}
			// Update list name (if any)
			if (elements[j].getAttribute('list') === null) { }
			else {
                // The 'list' attribute is apparently read only so you have to use setAttribute or it
                // doesn't actually update
				elements[j].setAttribute('list', create_new_indexed_string(elements[j].getAttribute('list'), index));
			}
            update_event_hook_index(elements[j], ['onblur', 'onchange', 'oninput', 'onkeyup'], index);
            if (elements[j].classList.contains("dynamic-row-index-label")) {
                // Set the value of elements with 'dynamic-row-index-label' equal to the index
                //  and disable (they are just labels)
                elements[j].value = index;
                elements[j].disabled = true;
            }
		}
		// Update buttons
		var buttons = row.cells[i].getElementsByTagName("button");
		for (var j = 0; j < buttons.length; j++) {
			buttons[j].disabled = false;
			// Update input name and id
			buttons[j].name = create_new_indexed_string(buttons[j].name, index);
			buttons[j].setAttribute('id', buttons[j].name); // They should always be the same
            update_event_hook_index(buttons[j], ['onclick', 'onblur', 'onmouseout'], index);
		}
		// Update textareas
		var textareas = row.cells[i].getElementsByTagName("textarea");
		for (var j = 0; j < textareas.length; j++) {
			textareas[j].disabled = false;
			// Update input name and id
			textareas[j].name = create_new_indexed_string(textareas[j].name, index);
			textareas[j].setAttribute('id', textareas[j].name); // They should always be the same
            update_event_hook_index(textareas[j], ['onblur'], index);
		}
		// Process template datalists
		var datalists = row.cells[i].getElementsByTagName("datalist");
		for (var j = 0; j < datalists.length; j++) {
			datalists[j].id = create_new_indexed_string(datalists[j].id, index);
		}
	}
	return row;
}

function append_table(table_id) {
	/*
	Adds a row to the end of tbody by using the template row of the table.
	Returns the id of the newly created row;
	*/
	var table = document.getElementById(table_id);
	var tbody = table.getElementsByTagName("tbody")[0];
	var template = document.getElementById(table_id + "_template_resolved");
	var index = find_lowest_unused_index(table);
	var clone = create_row_from_template(template, index);
	tbody.appendChild(clone)
	return clone.id;
}

function add_row_after(e) {
	/* Adds a new row immediately after the row of element passed */
	if (e.nodeName === "TR") {
		var row = e;
	} else {
		var row = e.closest("tr");
	}
	var table = row.closest("table");
	var template = document.getElementById(table.id + "_template_resolved");
	var index = find_lowest_unused_index(table);
	var clone = create_row_from_template(template, index);
	row.insertAdjacentElement('afterEnd', clone);
	relevel_rows(table);
}

function add_cloned_row_after(e, columns_to_ignore = []){
	/* Adds a new cloned row immediately after the row of element passed */	
	let row = document.getElementById(e.closest("tr").id);
	let table = e.closest("table");
	/* Set the columns to empty in the parent row and reset them to the original value 
	after the row has been cloned. Ideally used for the pk rows */
	e_original_values = {};
	columns_to_ignore.forEach(each_col => {
		e_original_values[each_col] = document.getElementById(each_col).getAttribute("value");
		document.getElementById(each_col).setAttribute("value", "");
	});

	let index = find_lowest_unused_index(table);
	let clone = create_row_from_template(row, index);
	row.insertAdjacentElement('afterEnd', clone);

	// Reset the changed columns to the original value since the row has been cloned
	columns_to_ignore.forEach(each_col => {
		document.getElementById(each_col).setAttribute("value", e_original_values[each_col]);
	});
	relevel_rows(table);
}

function delete_row(element) {
	/* The passed element is the button */
	var row = element.closest("tr");
	var table = row.closest("table");
	row.parentNode.removeChild(row);
	relevel_rows(table);
}

function relevel_rows(table) {
	/* Updates all rows of a table so that the row indices are in numeric order.
	 * This is acheived by changing the indices themselves, not by moving the rows.
	 */
	var indices = [];
	var rows = table.getElementsByTagName("tbody")[0].getElementsByTagName("tr");
	for (var i = 0; i < rows.length; i++) {
		// Index is the last element in the row ID
		var id_split = rows[i].id.split('_');
		var index = id_split[id_split.length - 1];
		// Check if row is the template before coercing to a number
		if (index === "resolved") { index = 0; }
		else { index = parseInt(index); }
		indices.push(index);
	}
	// Start at 1, not 0 -- 0 is the template row
	for (var i = 1; i < indices.length; i++) {
		var index = indices[i];
	}
	indices.sort(function (a, b) { return a - b; });
	// Start at 1, not 0 -- 0 is the template row
	for (var i = 1; i < rows.length; i++) {
		rows[i] = set_row_index(rows[i], i);
	}
}

function getSuggestions(e, url, minimum_length=4, max_returned=10) {
	// Gets suggestions to the element (e) containing a datalist, and this suggestions
	// are based on the element.value.
	let partial = e.value;
	if (partial.length < minimum_length) { return; }
	$.ajax({
		async: true, dataType: 'json', type: 'GET',
		data: {'match': partial},
		url: url,
		success: function (res) {
			let datalist = document.getElementById(e.list.id);
			datalist.innerHTML = '';
			for (let i = 0; i < max_returned && i < res.length; i++) {
				let option = document.createElement('option');
				option.value = res[i];
				datalist.appendChild(option);
			}
		}
	})
}

function getSelectOptions(source_element, target_element, url, minimum_length=4, args=null, reset=true) {
	// This function creates a set of <option></option> elements and injects them into the
	//    `target_element`. The set of options is determined by the API response, which should be a list
	//    of options. The API accepts a `source_value`, which affects the options that are returned. The
	//    source value is the value of the `source_element` that is passed when calling this function.
	//  The optional `args` parameter may be used by callers that need to pass additional data to the
	//    API
	//  The `reset` parameter dictates whether or not any already selected option(s) should be kept or
	//    discarded
	// TODO: Add check that the source_element is in fact a select-type input
	let source_value = source_element.value;
	if(source_value.length < minimum_length){
		return;
	}
	$.ajax({
		async: true,
		dataType: 'json',
		type: 'GET',
		data: {
			'source_value': source_value,
			'args': args
		},
		url: url,
		success: function (res) {
			let selected_options = [];
			if (reset === false) {
				for (let i = 0; i < target_element.selectedOptions.length; i++) {
					selected_options.push(target_element.selectedOptions[i]);
				}
			}
			target_element.innerHTML = null; // Resets the number of options
			for (let i = 0; i < selected_options.length; i++) {
				target_element.appendChild(selected_options[i]);
			}
			for (let matches = 0; matches < res.length; matches++) {
				let option_element = document.createElement('option');
				option_element.value = res[matches]; 
				option_element.text = res[matches];
				target_element.appendChild(option_element);
			}
		}
	})
}

function toggleEnabled(input_id_list) {
	/*
	Toggles the 'disabled' state of the inputs indicated by the names in the
	<input_id_list>.
	This function uses getElementsByName()[0], therefore updating only the 
	first element of a given name. This function will therefore not work
	for all elements if they share a name.
	*/
	for (var i = 0; i < input_id_list.length; i++) {
		e = document.getElementById(input_id_list[i]);
		// Explicitly check for cases where disabled is undefined
		if (typeof e.disabled == "undefined") {
			e.disabled = true;
		}
		else if (e.disabled) {
			e.disabled = false;
		} else {
			e.disabled = true;
		}
	}
}

function enableElements(elements_id_list){
	/* Enables all elements indicated by the list of IDs passed. */
	
	for(let i = 0; i < elements_id_list.length; i++){
		let e = document.getElementById(elements_id_list[i]);
		if (typeof e.disabled == "undefined") {
			e.disabled = false;
		}
		else if (e.disabled) {
			e.disabled = false;
		}
	}
}

function disableElements(elements_id_list){
	/* Disables all elements indicated by the list of IDs passed. */
	for(let i = 0; i < elements_id_list.length; i++){
		let e = document.getElementById(elements_id_list[i]);
		if (typeof e.disabled == "undefined") {
			e.disabled = true;
		}
		else if (!e.disabled) {
			e.disabled = true;
		}
	}
}

function enableSection(section_id) {
    /* Enables all child input elements of the element indicated
    by :section_id.
    */
    var e = document.getElementById(section_id);
    var inputs = e.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        // Some inputs should always be disabled
        if (
            inputs[i].classList.contains("dynamic-default-disabled") ||
            inputs[i].classList.contains("dynamic-row-index-label")
        ) {} else {
			var id_split = inputs[i].id.split('_');
			var index = id_split[id_split.length-1];
			if (index != 0) {
            	inputs[i].disabled = false;
			}
        }
    }
    var buttons = e.getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = false;
    }
    var selects = e.getElementsByTagName("select");
    for (var i = 0; i < selects.length; i++) {
        selects[i].disabled = false;
    }
    var textareas = e.getElementsByTagName("textarea");
    for (var i = 0; i < textareas.length; i++) {
        textareas[i].disabled = false;
    }
    // Make sure template inputs remain disabled
    hide_table_templates();
}

function disableSection(section_id) {
    /* Enables all child input elements of the element indicated
    by :section_id.
    */
    var e = document.getElementById(section_id);
    var inputs = e.getElementsByTagName("input");
    for (var i = 0; i < inputs.length; i++) {
        inputs[i].disabled = true;
    }
    var buttons = e.getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i++) {
        buttons[i].disabled = true;
    }
    var selects = e.getElementsByTagName("select");
    for (var i = 0; i < selects.length; i++) {
        selects[i].disabled = true;
    }
    var textareas = e.getElementsByTagName("textarea");
    for (var i = 0; i < textareas.length; i++) {
        textareas[i].disabled = true;
    }
}

function getValueByInput(input_source_name, input_target_name, url, minimum_length=0) {
    /* Based on the value of the element specified via <input_source_name>,
    the api <url> is used to determine what value to set the input specified
    by <input_target_name>. */
	// TODO Consider adding an overwrite_value flag that toggles this function's
	//  behavior to respect existing input values (i.e. not overwriting any already
	//  present user input.)
    var source = document.getElementsByName(input_source_name)[0];
    var source_val = source.value;
    var target = document.getElementsByName(input_target_name)[0];
	if (source_val.length < minimum_length) { return; }
    // TODO Make sure source and target elements exist before doing anything
    $.ajax({
		async: true, dataType: 'json', type: 'GET',
		data: {'query': source_val},
		url: url,
		success: function (res) {
		    target.value = res;
		}
	})
}

function getValueByMultipleInputs(list_input_source_names, input_target_name, url) {
    /* This is a multi-input version of the getValueByInput function. <list_input_source_names> 
	is an array/list that contains the ids of the source inputs. E.g., [input_source_id_1, input_source_id_2, ...]

	This is useful when populating one input requires information from more than one input.
	// TODO There should only be a single getValueByInput function that optionally allows the caller
	//  to specify multiple source values, preferably passed to the caller as a JSON so that input IDs
	//  can be passed along with the value.
	// TODO This should accept input IDs, not names, as multiple inputs can have the same name on a single form.
	*/
	let data = {}
	for(let i = 0; i < list_input_source_names.length; i++){
		let element = document.getElementById(list_input_source_names[i])
		let data_key = element.id
		data[data_key] = element.value
	}
    let target = document.getElementsByName(input_target_name)[0];
    // TODO Make sure source and target elements exist before doing anything
    $.ajax({
		async: true, dataType: 'json', type: 'GET',
		data: data,
		url: url,
		success: function (res) {
		    target.value = res;
		}
	})
}

function getValueByInputAndTriggerAlert(input_source_name, input_target_name, url) {
	/* This value makes a request to the specified API :url using the value of the input indicated
	by :input_source_name. The API response value is used to set the value of the input indicated
	by :input_target_name. If the API response causes the target input value to update and
	specifies 'alert'=True, then a notification is displayed alerting the user of this change. */
	let source = document.getElementsByName(input_source_name)[0];
	let target = document.getElementsByName(input_target_name)[0];
	if (target && source) {
		$.ajax({
			async: true,
			dataType: 'json',
			type: 'GET',
			data: {
				'query': source.value,
				'target_element': target.id
			},
			url: url,
			success: function (res) {
				if (res.change) {
					let alert_snackbar = document.getElementsByClassName("alert_snackbar")[0];
					target.value = res.value;
					if (res.alert && alert_snackbar) {
						alert_snackbar.innerHTML = `<strong>${res.target_element}</strong> set to <strong>'${res.value}'</strong>`;
						alert_snackbar.classList.toggle('show');
						target.classList.toggle('is-update');
						// The setTimeout beneath controls how many seconds the alert_snackbar shows.
						setTimeout(() => {
							alert_snackbar.classList.toggle('show');
							target.classList.toggle('is-update');
						}, 5000)
					}
				}
			}
		})
	}
}

function getAllInputElements() {
	/* Returns an array consisting of all data input elements, including input, select,
	and textareas. */
	const inputs = Array.from(document.getElementsByTagName("input"));
	const selects = Array.from(document.getElementsByTagName("select"));
	const textareas = Array.from(document.getElementsByTagName("textarea"));
	all = inputs.concat(selects, textareas);
	return all;
}

function overwriteInputsByInputPattern(input_source_name, input_target_pattern) {
	/* Overwrites the value of all elements in the array of inputs specified
	by <input_target_pattern> by the value of the element indicated by
	<input_source_name>. All inputs with names matching the input_target_pattern
	are overwritten by the source value.
	Currently, only pattens line 'some_input_name_#' are supported, where # is any integer.
	*/
	if (input_source_name === undefined) {
		return;
	}
	let source = document.getElementsByName(input_source_name)[0]

	// Try to match the input_target_pattern
	const selects = Array.from(document.getElementsByTagName("select"));
	let all_inputs = Array.from(document.getElementsByTagName("input")).concat(selects);

	if (input_target_pattern === undefined) {
		return;
	}
	// Bound the forloop by the length of all the inputs, because there can't be
	//  more target inputs than there are total inputs after all.
	for (let i = 1; i < all_inputs.length; i++) {
		let target = document.getElementsByName(input_target_pattern.replace('#', i))[0];
		if (target === undefined) {
			break;
		}
		target.value = source.value;
		// Manually fire blur event to simulate the user leaving input
		target.dispatchEvent(new Event('blur'));
	}
	// TODO
	return;
}

function overwriteInputsByInput(input_source_name, input_target_names) {
	/* Overwrites the value of all elements in the array of inputs specified
	by <input_target_names> by the value of the element indicated by
	<input_source_name>. */
	if (input_source_name === undefined) {
		return;
	}
	var source = document.getElementsByName(input_source_name)[0]
	if (input_target_names === undefined) {
		return
	}
	for (let input_target_name of input_target_names) {
		var target = document.getElementsByName(input_target_name)[0];
		target.value = source.value;
		// Manually fire blur event to simular user leaving input
		target.dispatchEvent(new Event('blur'));
	}
}

function abandonChangesAlert(url) {
    /*
        This function presents an alert to the user alerting that leaving
        the page will abandon any changes not saved. If the user clicks
        'Okay', they are then directed to the page specified by <url> and
        any changes made on the page that were not submitted are lost.
    */
    var response = confirm("Any unsaved changes will be lost. Are you sure you want to proceed?")
    if (response == true) {
        window.location.href = url;
    }

}

function autofillTableRows(inputInRowToPopulate, data, url, tableId, numberOfRows){
	/* Function used to automatically create and populate rows into line tables.

		TODO Allow inputInRowToPopulate to be an array.
	*/
	if(!data || !numberOfRows){
		return;
	}
	$.ajax({
		async: true,
		dataType: 'json',
		type: 'GET',
		data: {
			'data': data,
			'rows': numberOfRows
		},
		url: url,
		success: function (res) {
			// Grab the template each time before re entering data in the table body.
			let template = $(`#${tableId}_template`)
			$('#' + tableId + ' tbody').empty();
			$('#' + tableId + ' tbody').append(template);

			for(let [responseIndex, value] of Object.entries(res)){
				append_table(tableId)
				let fieldIdInRow = `${inputInRowToPopulate}_`+`${parseInt(responseIndex)+1}`
				document.getElementById(fieldIdInRow).value = value;
			}
		}
	})
}

function download_dashboard() {
	/*
	Makes a GET request to the current URL which should be an API that
	returns a CSV in an HTTP Response. The server must set the Content-Disposition
	header value to 'attachment' or the page will be reloaded rather than just
	downloading the attachment.
	*/
	var url = new URL(window.location.href);
	url.searchParams.append('download', 'y');
	window.location = url;
}