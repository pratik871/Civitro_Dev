package aadhaar

import "encoding/xml"

// XML struct definitions matching UIDAI's offline Aadhaar format.
// Root element: <OfflinePaperlessKyc>

type aadhaarXML struct {
	XMLName      xml.Name   `xml:"OfflinePaperlessKyc"`
	ReferenceID  string     `xml:"referenceId,attr"`
	GeneratedOn  string     `xml:"generatedDateTime,attr"`
	Poi          poiElement `xml:"UidData>Poi"`
	Poa          poaElement `xml:"UidData>Poa"`
	Photo        string     `xml:"UidData>Pht"`
	Signature    xmlSig     `xml:"Signature"`
}

type poiElement struct {
	Name   string `xml:"name,attr"`
	DOB    string `xml:"dob,attr"`
	Gender string `xml:"gender,attr"`
	Phone  string `xml:"phone,attr"`
	Email  string `xml:"e,attr"`
}

type poaElement struct {
	CareOf   string `xml:"co,attr"`
	House    string `xml:"house,attr"`
	Street   string `xml:"street,attr"`
	Landmark string `xml:"lm,attr"`
	Locality string `xml:"loc,attr"`
	VTC      string `xml:"vtc,attr"`
	District string `xml:"dist,attr"`
	State    string `xml:"state,attr"`
	Pincode  string `xml:"pc,attr"`
	Country  string `xml:"country,attr"`
}

type xmlSig struct {
	XMLName xml.Name `xml:"Signature"`
	Inner   string   `xml:",innerxml"`
}

// formatAddress builds a single-line address from POA fields.
func (p *poaElement) formatAddress() string {
	parts := []string{}
	for _, s := range []string{p.House, p.Street, p.Landmark, p.Locality, p.VTC, p.District, p.State, p.Pincode} {
		if s != "" {
			parts = append(parts, s)
		}
	}
	result := ""
	for i, part := range parts {
		if i > 0 {
			result += ", "
		}
		result += part
	}
	return result
}
