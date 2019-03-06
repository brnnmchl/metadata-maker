/*	There are some blocks of numbers 4 or 5 digits long that require leading zeros if the number isn't big enough to
 *	fill all the digits.
 *
 *	content: The number that needs to go into the field
 *	type: Determines the number of digits to output
 *			- 'length' will output 4 digits
 *			- anything else will output 5 digits
 */
function addZeros(content,type) {
	var str = content.toString();
	if (type === 'length') {
		var num_zeros = 4 - str.length;
	}
	else {
		var num_zeros = 5 - str.length;
	}
	var output = '';
	for (var i = 0; i < num_zeros; i++) {
		output += '0';
	};
	output += str;
	return output;
}

/*
 * returns the length of a UTF-8 string in bytes. Acounts for the varying lengths of characters.
 */
function getByteLength(text) {
	var byteLength = 0;
	for (var i = 0; i < text.length; i++) {
		var c = text[i];
		
		if ( c <= '\u007F' && c >= '\u0000') {
			byteLength += 1;
		}
		else if ( c >= '\u0080' && c <= '\u07FF') {
			byteLength += 2;
		}
		else if ( c >= '\u0800' && c <= '\uFFFF') {
			byteLength += 3;
		}
		else if ( c >= '\u10000' && c <= '\u1FFFFF') {
			byteLength += 4;
		}
	}
	return byteLength;
}

/*
 * Create a datafield from the tag, the two ind's, and an array of subfields.
 */
function createMARCXMLField(tag,ind1,ind2,subfields) {
	var datafield = '  <datafield tag="' + tag + '" ind1="' + ind1 + '" ind2="' + ind2 + '">\n';
	for (var i = 0; i < subfields.length; i++) {
		datafield += subfields[i];
	}
	datafield += '  </datafield>\n';
	return datafield;
}

//Return the results based on which download function was called
function returnSingleEntry(tag,content,head) {
	//MARC
	if (head !== null) {
		var content_directory = createDirectory(tag,content,head);
		return [content_directory,content];
	}
	//MARCXML
	else {
		return content;
	}
}

//Return the results based on which download function was called
function returnMultipleEntries(directory,content,head) {
	//MARC
	if (head !== null) {
		return [directory,content,head];
	}
	//MARCXML
	else {
		return content;
	}
}

function fillISBN(record,head,fieldFunc,subfieldFunc) {
	var tag = '020';

	if (checkExists(record.isbn)) {
		var isbn = fieldFunc(tag,' ',' ',[subfieldFunc('a',record.isbn)]);

		return returnSingleEntry(tag,isbn,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillAuthor(record,head,fieldFunc,subfieldFunc) {
	var tag = '100';

	//Transliteration is in author_array[1], normal author input in author_array[0]
	var latin_index = checkExists(record.author[1]['family']) || checkExists(record.author[1]['given']) ? 1 : 0;
	var role_index = { 'art': 'artist', 'aut': 'author', 'ctb': 'contributor', 'edt': 'editor', 'ill': 'illustrator', 'trl': 'translator'}

	var author_content = '';
	if(checkExists(record.author[latin_index]['family']) && checkExists(record.author[latin_index]['given'])) {
		author_content = record.author[latin_index]['family'] + ', ' + record.author[latin_index]['given'] + ',';
	}
	else if (checkExists(record.author[latin_index]['family']) || checkExists(record.author[latin_index]['given'])) {
		if (checkExists(record.author[latin_index]['family'])) {
			author_content = record.author[latin_index]['family'] + ','
		}
		else {
			author_content = record.author[latin_index]['given'] + ','
		}
	}
	else {
		return head !== null ? ['',''] : '';
	}

	var author_subfields = [subfieldFunc('a',author_content),subfieldFunc('e', role_index[record.author[0]['role']] + '.'),subfieldFunc('4',record.author[0]['role'])];
	if (latin_index === 1) {
		author_subfields.push(subfieldFunc('6','880-03'));
	}
	var author = fieldFunc(tag,'1',' ',author_subfields);

	return returnSingleEntry(tag,author,head);
}

function fillTitle(record,head,fieldFunc,subfieldFunc) {
	var tag = '245';

	//author_array[0] contains the contents of the first author field
	var title_ind1 = checkExists(record.author[0]['family']) || checkExists(record.author[0]['given']) ? '1' : '0';
	var latin_index = checkExists(record.title[1]['title']) || checkExists(record.title[1]['subtitle']) ? 1 : 0;

	if (record.language === 'eng' || record.language === 'fre') {
		var title_ind2 = getNonfilingCount(record.title[latin_index]['title'],record.language);
	}
	else {
		var title_ind2 = '0';
	}

	var title_subfields = [];
	if (checkExists(record.title[0]['subtitle'])) {
		title_subfields.push(subfieldFunc('a',record.title[latin_index]['title'] + ' :'),subfieldFunc('b',record.title[latin_index]['subtitle'] + '.'));
	}
	else {
		title_subfields.push(subfieldFunc('a',record.title[latin_index]['title'] + '.'));
	}

	if (latin_index === 1) {
		title_subfields.push(subfieldFunc('6','880-01'));
	}

	var title = fieldFunc(tag,title_ind1,title_ind2,title_subfields);

	return returnSingleEntry(tag,title,head);
}

function fillEdition(record,head,fieldFunc,subfieldFunc) {
	var tag = '250';

	if (checkExists(record.edition)) {
		var subfields = [];
		if (checkExists(record.translit_edition)) {
			if (record.translit_edition.substring(record.translit_edition.length-1,record.translit_edition.length) === '.') {
				record.translit_edition = record.translit_edition.substring(0,record.translit_edition.length-1);
			}
			subfields.push(subfieldFunc('a',record.translit_edition + '.'));
			subfields.push(subfieldFunc('6','880-04'));
		}
		else {
			if (record.edition.substring(record.edition.length-1,record.edition.length) === '.') {
				record.edition = record.edition.substring(0,record.edition.length-1);
			}
			subfields.push(subfieldFunc('a',record.edition + '.'));
		}
		var edition = fieldFunc(tag,' ',' ',subfields);

		return returnSingleEntry(tag,edition,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillPublication(record,head,fieldFunc,subfieldFunc) {
	var tag = '264';

	var pub_subfields = [];
	if (checkExists(record.publication_place)) {
		if (checkExists(record.translit_place)) {
			pub_subfields.push(subfieldFunc('a',record.translit_place + ' :'));
		}
		else {
			pub_subfields.push(subfieldFunc('a',record.publication_place + ' :'));
		}
	}
	else {
		pub_subfields.push(subfieldFunc('a','[Place of publication not identified] :'));
	}

	if (checkExists(record.publisher)) {
		if (checkExists(record.translit_publisher)) {
			pub_subfields.push(subfieldFunc('b',record.translit_publisher + ','));
		}
		else {
			pub_subfields.push(subfieldFunc('b',record.publisher + ','));
		}
	}
	else {
		pub_subfields.push(subfieldFunc('b','[publisher not identified],'));
	}

	if (checkExists(record.publication_year)) {
		pub_subfields.push(subfieldFunc('c',record.publication_year + '.'));
	}
	else if (checkExists(record.copyright_year)) {
		pub_subfields.push(subfieldFunc('c','[' + record.copyright_year + ']'));
	}
	else {
		pub_subfields.push(subfieldFunc('c','[date of publication not identified]'));
	}

	if (checkExists(record.translit_publisher)  || checkExists(record.translit_place)) {
		pub_subfields.push(subfieldFunc('6','880-02'));
	}

	var pub = fieldFunc(tag,' ','1',pub_subfields);

	return returnSingleEntry(tag,pub,head);
}

function fillCopyright(record,head,fieldFunc,subfieldFunc) {
	var tag = '264';

	if (checkExists(record.copyright_year)) {
		var copyright = fieldFunc(tag,' ','4',[subfieldFunc('c','\u00A9' + record.copyright_year)]);

		return returnSingleEntry(tag,copyright,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillPhysical (record,head,fieldFunc,subfieldFunc) {
	var tag = '300';

	var physical_subfields = [];

	if (record.pages === '0' || record.unpaged || (record.volume_or_page === 'volumes' && record.pages === '1')) {
		var pages_string = '1 volume (unpaged)';
	}
	else if (record.pages === '1') {
		var pages_string = '1 page';
	}
	else {
		var pages_string = record.pages + ' ' + record.volume_or_page;
	}

	if (checkExists(record.illustrations_yes) && record.illustrations_yes == true) {
		physical_subfields.push(subfieldFunc('a',pages_string + ' :'),subfieldFunc('b','illustrations ;'));
	}
	else {
		physical_subfields.push(subfieldFunc('a',pages_string + ' ;'));
	}
	physical_subfields.push(subfieldFunc('c',record.dimensions + ' cm'));
	var physical = fieldFunc(tag,' ',' ',physical_subfields);

	return returnSingleEntry(tag,physical,head);
}

function fillNotes(record,head,fieldFunc,subfieldFunc) {
	var tag = '500';

	if (checkExists(record.notes)) {
		var notes = fieldFunc(tag,' ',' ',[subfieldFunc('a',record.notes)]);

		return returnSingleEntry(tag,notes,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillKeywords(record,head,fieldFunc,subfieldFunc) {
	var tag = '653';

	var keywords_content = '';
	var keywords_directory = '';
	for (var c = 0; c < record.keywords.length; c++) {
		if (record.keywords[c] !== '') {
			var new_content = fieldFunc(tag,' ',' ',[subfieldFunc('a',record.keywords[c])]);
			keywords_content += new_content;

			//MARC
			if (head !== null) {
				var new_directory = createDirectory(tag,new_content,head);
				head += getByteLength(new_content);
				keywords_directory += new_directory;
			}
		}
	}

	return returnMultipleEntries(keywords_directory,keywords_content,head);
}

function fillFAST(record,head,fieldFunc,subfieldFunc) {
	if (checkExists(record.fast)) {
		var FAST = '';
		var FAST_directory = '';
		for (var i = 0; i < record.fast.length; i++) {
			var contentType = record.fast[i][2].substring(1);
			var FAST_subfield = [];
			if (contentType == '00') {
				handleSpecialFAST(record.fast[i][0],record.fast[i][0].indexOf(','),',','d',FAST_subfield,subfieldFunc);
			}
			else if (contentType == '30') {
				handleSpecialFAST(record.fast[i][0],-1,'.','p',FAST_subfield,subfieldFunc);
			}
			else if (contentType == '51') {
				handleSpecialFAST(record.fast[i][0],-1,'/','z',FAST_subfield,subfieldFunc);
			}
			else {
				FAST_subfield.push(subfieldFunc('a',record.fast[i][0]));
			}

			FAST_subfield.push(subfieldFunc('2','fast'));
			FAST_subfield.push(subfieldFunc('0','(OCoLC)' + record.fast[i][1]));

			var new_content = fieldFunc('6' + contentType,record.fast[i][3],'7',FAST_subfield);
			FAST += new_content;

			//MARC
			if (head !== null) {
				var new_directory = createDirectory('6' + contentType,new_content,head);
				head += getByteLength(new_content);
				FAST_directory += new_directory;
			}
		}

		return returnMultipleEntries(FAST_directory,FAST,head);
	}
	else {
		return head !== null ? ['','',head] : '';
	}
}

function fillAdditionalAuthors(record,head,fieldFunc,subfieldFunc) {
	var tag = '700';

	if (checkExists(record.additional_authors)) {
		var authors = '';
		var authors_directory = '';
		var translit_counter = 5;
		var role_index = { 'art': 'artist', 'aut': 'author', 'ctb': 'contributor', 'edt': 'editor', 'ill': 'illustrator', 'trl': 'translator'}

		for (var i = 0; i < record.additional_authors.length; i++) {
			if (checkExists(record.additional_authors[i][0]['family']) || checkExists(record.additional_authors[i][0]['given'])) {
				var latin_index = checkExists(record.additional_authors[i][1]['family']) || checkExists(record.additional_authors[i][1]['given']) ? 1 : 0;

				if (checkExists(record.additional_authors[i][latin_index]['family']) && checkExists(record.additional_authors[i][latin_index]['given'])) {
					var authors_content = record.additional_authors[i][latin_index]['family'] + ', ' + record.additional_authors[i][latin_index]['given'] + ',';
				}
				else if (checkExists(record.additional_authors[i][latin_index]['family']) || checkExists(record.additional_authors[i][latin_index]['given'])) {
					if (checkExists(record.additional_authors[i][latin_index]['family'])) {
						var authors_content = record.additional_authors[i][latin_index]['family'] + ',';
					}
					else {
						var authors_content = record.additional_authors[i][latin_index]['given'] + ',';
					}
				}

				var authors_subfield = [subfieldFunc('a',authors_content),subfieldFunc('e',role_index[record.additional_authors[i][0]['role']] + '.'),subfieldFunc('4',record.additional_authors[i][0]['role'])];
				if (latin_index === 1) {
					if (translit_counter < 10) {
						var translit_index = '0' + translit_counter;
					}
					else {
						var translit_index = translit_counter;
					}
					authors_subfield.push(subfieldFunc('6','880-' + translit_index));
					translit_counter++;
				}
				var new_content = fieldFunc(tag,'1',' ',authors_subfield);
				authors += new_content;

				//MARC
				if (head !== null) {
					var new_directory = createDirectory(tag,new_content,head);
					head += getByteLength(new_content);
					authors_directory += new_directory;
				}
			}
		}

		return returnMultipleEntries(authors_directory,authors,head);
	}
	else {
		return head !== null ? ['','',head] : '';
	}
}

function fillTranslitTitle(record,head,fieldFunc,subfieldFunc) {
	var tag = '880';

	//author_array[0] contains the contents of the first author field
	var title_ind1 = checkExists(record.author[0]['family']) || checkExists(record.author[0]['given']) ? '1' : '0';

	if (checkExists(record.title[1]['title'])) {
		var translit_subfields = [];
		if (checkExists(record.title[1]['subtitle'])) {
			translit_subfields.push(subfieldFunc('6','245-01'),subfieldFunc('a',record.title[0]['title'] + ' :'),subfieldFunc('b',record.title[0]['subtitle'] + '.'));
		}
		else {
			translit_subfields.push(subfieldFunc('6','245-01'),subfieldFunc('a',record.title[0]['title'] + '.'));
		}
		var title880 = fieldFunc(tag,title_ind1,'0',translit_subfields);

		return returnSingleEntry(tag,title880,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillTranslitEdition(record,head,fieldFunc,subfieldFunc) {
	var tag = '880';

	if (checkExists(record.translit_edition)) {
		var translit_content = [subfieldFunc('6','250-04'),subfieldFunc('a',record.edition + '.')];
		var edition880 = fieldFunc(tag,' ',' ',translit_content);

		return returnSingleEntry(tag,edition880,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillTranslitPublisher(record,head,fieldFunc,subfieldFunc) {
	var tag = '880';

	if (checkExists(record.translit_publisher) || checkExists(record.translit_place)) {
		var translit_content = [subfieldFunc('6','264-02')];

		if (checkExists(record.translit_place)) {
			translit_content.push(subfieldFunc('a',record.publication_place + ' :'));
		}

		if (checkExists(record.translit_publisher)) {
			translit_content.push(subfieldFunc('b',record.publisher + ','));
		}

		if (checkExists(record.publication_year)) {
			translit_content.push(subfieldFunc('c',record.publication_year + '.'));
		}
		else if (checkExists(record.copyright_year)) {
			translit_content.push(subfieldFunc('c','[' + record.copyright_year + ']'));
		}
		else {
			translit_content.push(subfieldFunc('c','[date of publication not identified]'));
		}

		console.log(translit_content);

		var publisher880 = fieldFunc(tag,' ','1',translit_content);

		return returnSingleEntry(tag,publisher880,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillTranslitAuthor(record,head,fieldFunc,subfieldFunc) {
	var tag = '880';

	//Check if either transliteration field has content
	if (checkExists(record.author[1]['family']) || checkExists(record.author[1]['given'])) {
		var translit_content = [subfieldFunc('6','100-03')];

		if (checkExists(record.author[0]['family']) && checkExists(record.author[0]['given'])) {
			translit_content.push(subfieldFunc('a',record.author[0]['family'] + ', ' + record.author[0]['given'] + '.'));
		}
		else {
			if (checkExists(record.author[0]['family'])) {
				translit_content.push(subfieldFunc('a',record.author[0]['family'] + '.'));
			}
			else {
				translit_content.push(subfieldFunc('a',record.author[0]['given'] + '.'));
			}
		}

		var author880 = fieldFunc(tag,'1',' ',translit_content);

		return returnSingleEntry(tag,author880,head);
	}
	else {
		return head !== null ? ['',''] : '';
	}
}

function fillTranslitAdditionalAuthors(record,head,fieldFunc,subfieldFunc) {
	var tag = '880';

	if (checkExists(record.additional_authors)) {
		var authors880 = '';
		var authors880_directory = '';
		var translit_counter = 5;

		for (var i = 0; i < record.additional_authors.length; i++) {
			if ((checkExists(record.additional_authors[i][1]['family']) || checkExists(record.additional_authors[i][1]['given'])) && (checkExists(record.additional_authors[i][0]['family']) || checkExists(record.additional_authors[i][0]['given']))) {
				if (checkExists(record.additional_authors[i][0]['family']) && checkExists(record.additional_authors[i][0]['given'])) {
					var authors_content = record.additional_authors[i][0]['family'] + ', ' + record.additional_authors[i][0]['given'] + '.'
				}
				else {
					if (checkExists(record.additional_authors[i][0]['family'])) {
						var authors_content = record.additional_authors[i][0]['family'] + '.';
					}
					else {
						var authors_content = record.additional_authors[i][0]['given'] + '.';
					}
				}

				if (translit_counter < 10) {
					var translit_index = '0' + translit_counter;
				}
				else {
					var translit_index = translit_counter;
				}
				translit_counter++;

				var new_content = fieldFunc(tag,'1',' ',[subfieldFunc('6','700-' + translit_index),subfieldFunc('a',authors_content)]);
				authors880 += new_content;

				//MARC
				if (head !== null) {
					var new_directory = createDirectory(tag,new_content,head);
					head += getByteLength(new_content);
					authors880_directory += new_directory;
				}
			}
		}

		return returnMultipleEntries(authors880_directory,authors880,head);
	}
	else {
		return head !== null ? ['','',head] : '';
	}
}








/*
 * Create the MARCXML document
 *	record: Library with all the information input by the user
 *	institution_info: Library containing multiple forms of the name of the cataloguing instutition. Defaults to 
 *		University of Illinois at Urbana-Champaign
 */
function downloadXML(record,institution_info) {
	var text = '<?xml version="1.0" encoding="utf-8"?>\n<record xmlns="http://www.loc.gov/MARC21/slim" xsi:schemaLocation="http://www.loc.gov/MARC21/slim http://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n  <leader>01447nam a2200397ki 4500</leader>\n';
	
	var formatted_date = getTimestamp();
	text += '  <controlfield tag="005">' + formatted_date + '</controlfield>\n';
	
	var controlfield008 = create008Field(record);
	text += '  <controlfield tag="008">' + controlfield008 + '</controlfield>\n'
	
	text += createMARCXMLField('040',' ',' ',[createMARCXMLSubfield('a',institution_info['marc']),createMARCXMLSubfield('b','eng'),createMARCXMLSubfield('e','rda'),createMARCXMLSubfield('c',institution_info['marc'])]);
	text += fillISBN(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillAuthor(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTitle(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillEdition(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillPublication(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillCopyright(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillPhysical(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += createMARCXMLField('336',' ',' ',[createMARCXMLSubfield('a','text'),createMARCXMLSubfield('b','txt'),createMARCXMLSubfield('2','rdacontent')]) + createMARCXMLField('337',' ',' ',[createMARCXMLSubfield('a','unmediated'),createMARCXMLSubfield('b','n'),createMARCXMLSubfield('2','rdamedia')]) + createMARCXMLField('338',' ',' ',[createMARCXMLSubfield('a','volume'),createMARCXMLSubfield('b','nc'),createMARCXMLSubfield('2','rdacarrier')]);
	text += fillNotes(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillKeywords(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillFAST(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillAdditionalAuthors(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTranslitTitle(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTranslitEdition(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTranslitPublisher(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTranslitAuthor(record,null,createMARCXMLField,createMARCXMLSubfield);
	text += fillTranslitAdditionalAuthors(record,null,createMARCXMLField,createMARCXMLSubfield);
	text +='</record>\n';

	downloadFile(text,'xml');
}