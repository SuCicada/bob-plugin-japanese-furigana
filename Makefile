dist = dist
$(dist):
	mkdir -p $@

output = $(dist)/japanese-furigana.bobplugin

build: $(dist)
	zip -j $(output) src/*
	unzip -l $(output)

install: build
	open $(output)
