# Copyright 2013, University of Freiburg,
# Chair of Algorithms and Data Structures.
# Author: Patrick Brosi <brosip@informatik.uni-freiburg.de>

SRC = $(filter-out $(wildcard js/*.min.js), $(wildcard js/*.js))
MIN = $(patsubst %.js, %.min.js, $(SRC))

all: minimize

minimize: $(MIN)

%.min.js: %.js
	uglifyjs $< -mc -o $@

clean:
	rm -f $(MIN)
